import { formatearPeriodoCertificacion, generarCodigoVerificacion, puedeFirmarse } from "../../domain/certificacion.entity";
import {
  CertificacionConHallazgoCriticoError,
  CertificacionNoEditableError,
  CodigoVerificacionEnColisionError,
  InspeccionNoEncontradaError,
  SincronizacionPendienteError,
} from "../../domain/inspeccion.errors";
import type { AlmacenamientoEvidenciasPort } from "../../domain/almacenamiento-evidencias.port";
import type { GeneradorPdfCertificacionPort } from "../../domain/generador-pdf-certificacion.port";
import type { AlcanceConsulta, CertificacionRepositoryPort } from "../../domain/certificacion.repository.port";
import type { HallazgoRepositoryPort } from "../../domain/hallazgo.repository.port";
import type { FirmarCertificacionInput } from "../certificacion.schema";
import type { GestionarHallazgosUseCase } from "./gestionar-hallazgos.usecase";

const MAX_INTENTOS_CODIGO = 5;

/**
 * Firma/certifica una certificación completada por el wizard de 015: valida que esté
 * `EN_PROGRESO` y sin pendientes de sincronizar (012), delega en `sp_inspeccion_firmar` el
 * recálculo atómico de puntaje/porcentaje/clasificación + cambio de estado (rechazando la
 * firma si hay un hallazgo `CRITICA` sin resolver, 013), genera el PDF (incluyendo el listado
 * de hallazgos si existen) y lo sube a almacenamiento — en ese orden, porque el PDF necesita
 * el código de verificación y la fecha de vencimiento que produce la firma.
 */
export class FirmarCertificacionUseCase {
  constructor(
    private readonly repo: CertificacionRepositoryPort,
    private readonly generadorPdf: GeneradorPdfCertificacionPort,
    private readonly almacenamientoPdf: AlmacenamientoEvidenciasPort,
    private readonly hallazgoRepo?: HallazgoRepositoryPort,
    /**
     * Opcional para no romper tests existentes que no lo mockean. Cuando se inyecta, genera los
     * hallazgos automáticos (desde respuestas incumplidas, 013) antes de firmar — encontrado en
     * la ronda de pruebas E2E en Chrome del 2026-07-24: sin esto, un auditor podía firmar una
     * certificación con incumplimientos reales sin generar nunca el hallazgo correspondiente
     * (el bloqueo por hallazgo CRÍTICA de `sp_inspeccion_firmar` solo protege si el hallazgo ya
     * existe en BD en el momento de firmar). `generarAutomaticos` es idempotente.
     */
    private readonly gestionarHallazgos?: GestionarHallazgosUseCase,
  ) {}

  async ejecutar(
    id: string,
    empresaId: string,
    usuarioId: string,
    input: FirmarCertificacionInput,
    alcance?: AlcanceConsulta,
  ) {
    const certificacion = await this.repo.obtenerCompleta(id, empresaId, alcance);
    if (!certificacion) throw new InspeccionNoEncontradaError(id);
    if (certificacion.estado !== "EN_PROGRESO") throw new CertificacionNoEditableError();
    if (!puedeFirmarse(certificacion, input.pendientesSincronizacion)) {
      throw new SincronizacionPendienteError(input.pendientesSincronizacion);
    }

    if (this.gestionarHallazgos) {
      await this.gestionarHallazgos.generarAutomaticos(id, empresaId, alcance);
      await this.gestionarHallazgos.sincronizarComentariosCategorizados(id, empresaId, alcance);
    }

    const firmada = await this.firmarConReintento(id, usuarioId);

    const hallazgos = this.hallazgoRepo ? await this.hallazgoRepo.listarPorInspeccion(id, empresaId) : [];

    const pdfBuffer = await this.generadorPdf.generar({
      certificacionId: firmada.id,
      plantillaNombre: certificacion.plantilla.nombre,
      periodoEtiqueta: formatearPeriodoCertificacion(firmada),
      puntajeObtenido: firmada.puntajeObtenido,
      puntajeMaximo: firmada.puntajeMaximo,
      porcentajeCumplimiento: firmada.porcentajeCumplimiento,
      clasificacion: firmada.clasificacion,
      resultadoFinal: firmada.resultadoFinal!,
      codigoVerificacion: firmada.codigoVerificacion!,
      firmadoEn: firmada.firmadoEn!,
      fechaVencimiento: firmada.fechaVencimiento!,
      hallazgos: hallazgos.length > 0 ? hallazgos.map((h) => ({ descripcion: h.descripcion, categoria: h.categoria, severidad: h.severidad })) : undefined,
      urlVerificacion: `${process.env.WEB_PUBLIC_URL ?? "http://localhost:3000"}/verificar/${firmada.codigoVerificacion}`,
    });

    const ruta = `${empresaId}/${id}/certificado.pdf`;
    const pdfUrl = await this.almacenamientoPdf.subirArchivo(ruta, pdfBuffer, "application/pdf");

    return this.repo.establecerPdfUrl(id, pdfUrl);
  }

  private async firmarConReintento(id: string, usuarioId: string) {
    for (let intento = 0; intento < MAX_INTENTOS_CODIGO; intento++) {
      const codigo = generarCodigoVerificacion();
      try {
        return await this.repo.firmar(id, usuarioId, codigo);
      } catch (e) {
        if (this.esHallazgoCriticoPendiente(e)) throw new CertificacionConHallazgoCriticoError();
        if (!this.esColisionCodigo(e)) throw e;
      }
    }
    throw new CodigoVerificacionEnColisionError();
  }

  private esColisionCodigo(e: unknown): boolean {
    const mensaje = e instanceof Error ? e.message : String(e);
    return (
      mensaje.includes("codigo_verificacion") ||
      mensaje.includes("23505") ||
      mensaje.toLowerCase().includes("unique constraint")
    );
  }

  /** 013-hallazgos-plan-cumplimiento — `sp_inspeccion_firmar` rechaza la firma vía RAISE EXCEPTION. */
  private esHallazgoCriticoPendiente(e: unknown): boolean {
    const mensaje = e instanceof Error ? e.message : String(e);
    return mensaje.includes("hallazgo_critico_pendiente");
  }
}
