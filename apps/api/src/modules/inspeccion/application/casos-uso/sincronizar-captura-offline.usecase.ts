import { calcularPuntajeRespuesta, calcularResumen, indexarNodosConRuta, puedeEditarRespuestas } from "../../domain/certificacion.entity";
import {
  CertificacionNoEditableError,
  InspeccionNoEncontradaError,
  LoteSincronizacionExcedeLimiteError,
  RespuestaNoSincronizadaError,
} from "../../domain/inspeccion.errors";
import type {
  AlcanceConsulta,
  CertificacionRepositoryPort,
  DetallePendienteSincronizar,
} from "../../domain/certificacion.repository.port";
import type { RegistradorEventoAuditoria } from "../../../../shared/auditoria/registrar-evento-auditoria";
import type { SincronizarLoteInput } from "../certificacion.schema";
import type { ArchivoSubido, ResponderCertificacionUseCase } from "./responder-certificacion.usecase";

/** Máximo de respuestas por solicitud de sincronización (regla de negocio del spec 012). */
export const LIMITE_LOTE_SINCRONIZACION = 200;

export interface ResultadoSincronizacion {
  procesadas: number;
  conflictos: number;
  pendientes: number;
  sincronizadoEn: string;
}

export interface EstadoSincronizacion {
  sincronizadoEn: string | null;
  capturaOffline: boolean;
}

/**
 * Recibe lotes de respuestas capturadas offline y las aplica de forma idempotente
 * (upsert por `nodoId`), resolviendo conflictos de doble captura por última escritura.
 * El puntaje **nunca** se confía del cliente — se recalcula server-side con las mismas
 * reglas de dominio que usa el guardado en línea (`calcularPuntajeRespuesta`), igual que
 * `ResponderCertificacionUseCase.guardarRespuestasSeccion()`.
 */
export class SincronizarCapturaOfflineUseCase {
  constructor(
    private readonly repo: CertificacionRepositoryPort,
    private readonly responderUc: ResponderCertificacionUseCase,
    private readonly registrarEventoAuditoria?: RegistradorEventoAuditoria,
  ) {}

  async sincronizarLote(
    id: string,
    empresaId: string,
    usuarioId: string,
    input: SincronizarLoteInput,
    alcance?: AlcanceConsulta,
  ): Promise<ResultadoSincronizacion> {
    if (input.respuestas.length > LIMITE_LOTE_SINCRONIZACION) {
      throw new LoteSincronizacionExcedeLimiteError(LIMITE_LOTE_SINCRONIZACION);
    }

    const certificacion = await this.obtener(id, empresaId, alcance);
    if (!puedeEditarRespuestas(certificacion)) throw new CertificacionNoEditableError();

    const mapaNodos = indexarNodosConRuta(certificacion.plantilla.nodos);

    const detalles = input.respuestas
      .map((r): DetallePendienteSincronizar | null => {
        const info = mapaNodos.get(r.nodoId);
        if (!info) return null;
        return {
          nodoId: r.nodoId,
          rutaCodigos: info.rutaCodigos,
          rutaTitulos: info.rutaTitulos,
          preguntaTitulo: info.nodo.titulo,
          criterioSnapshot: info.nodo.criterio ?? null,
          tipoRespuesta: info.nodo.tipoRespuesta ?? "TEXTO_LIBRE",
          valor: r.valor ?? null,
          valores: r.valores ?? [],
          comentarioReconocimiento: r.comentarioReconocimiento ?? null,
          comentarioObservacion: r.comentarioObservacion ?? null,
          comentarioOportunidadMejora: r.comentarioOportunidadMejora ?? null,
          puntajeObtenido: calcularPuntajeRespuesta(info.nodo, r.valor ?? undefined, r.valores),
          puntajeMaximo: info.nodo.puntajeMaximo,
          capturadoEnCliente: r.capturadoEnCliente,
        };
      })
      .filter((d): d is DetallePendienteSincronizar => d !== null);

    const resultados = detalles.length
      ? await this.repo.upsertDetallesConResolucionConflicto(id, empresaId, detalles)
      : [];

    let conflictos = 0;
    for (const resultado of resultados) {
      if (!resultado.conflicto) continue;
      conflictos++;
      await this.registrarEventoAuditoria?.({
        empresaId,
        usuarioId,
        accion: "SINCRONIZACION_CONFLICTO",
        entidadTipo: "InspeccionDetalle",
        entidadId: resultado.detalle.nodoId,
        valorDespues: {
          valor: resultado.detalle.valor,
          valores: resultado.detalle.valores,
          comentarioReconocimiento: resultado.detalle.comentarioReconocimiento,
          comentarioObservacion: resultado.detalle.comentarioObservacion,
          comentarioOportunidadMejora: resultado.detalle.comentarioOportunidadMejora,
        },
      });
    }

    const sincronizadoEn = new Date();
    await this.repo.marcarSincronizado(id, empresaId, sincronizadoEn, input.capturaOffline);

    // Recalcular y persistir el resumen en la Inspeccion — si no, el listado (que lee estas
    // columnas directamente) queda en 0/0/0%/— hasta que se firme (ver decisiones.md, 2026-07-24).
    const detallesActualizados = new Map(certificacion.detalles.map((d) => [d.nodoId, d]));
    for (const resultado of resultados) {
      if (resultado.aplicado) detallesActualizados.set(resultado.detalle.nodoId, resultado.detalle);
    }
    const resumen = calcularResumen(
      Array.from(detallesActualizados.values()),
      certificacion.plantilla.puntajeMaximo,
      certificacion.plantilla.rangosResultado,
    );
    await this.repo.actualizarResumenProgreso(id, {
      puntajeObtenido: resumen.puntajeObtenido,
      puntajeMaximo: resumen.puntajeMaximo,
      porcentajeCumplimiento: resumen.porcentajeCumplimiento,
      clasificacion: resumen.clasificacion ?? null,
    });

    return {
      procesadas: resultados.length,
      conflictos,
      pendientes: 0,
      sincronizadoEn: sincronizadoEn.toISOString(),
    };
  }

  /**
   * Sube una evidencia capturada offline, resolviendo su `detalleId` a partir del `nodoId`
   * (el cliente offline solo conoce el `nodoId` — el `InspeccionDetalle` puede no haber
   * existido todavía al capturar la foto). Delega en `ResponderCertificacionUseCase` para no
   * duplicar la validación de tipo/tamaño ni la construcción de la ruta de almacenamiento.
   */
  async adjuntarEvidenciaPendiente(
    id: string,
    empresaId: string,
    nodoId: string,
    archivo: ArchivoSubido,
    alcance?: AlcanceConsulta,
  ) {
    const certificacion = await this.obtener(id, empresaId, alcance);
    const detalle = certificacion.detalles.find((d) => d.nodoId === nodoId);
    if (!detalle) throw new RespuestaNoSincronizadaError(nodoId);
    return this.responderUc.adjuntarEvidenciaRespuesta(id, empresaId, detalle.id, archivo, alcance);
  }

  /**
   * "Pendientes" es estado exclusivo del cliente (cola en IndexedDB) — el servidor no puede
   * contarlos de forma confiable, por eso este método solo refleja el resultado del último
   * lote ya procesado (`sincronizadoEn`/`capturaOffline`), no un conteo en tiempo real.
   */
  async obtenerEstado(id: string, empresaId: string, alcance?: AlcanceConsulta): Promise<EstadoSincronizacion> {
    const certificacion = await this.obtener(id, empresaId, alcance);
    return {
      sincronizadoEn: certificacion.sincronizadoEn ? certificacion.sincronizadoEn.toISOString() : null,
      capturaOffline: certificacion.capturaOffline,
    };
  }

  private async obtener(id: string, empresaId: string, alcance?: AlcanceConsulta) {
    const certificacion = await this.repo.obtenerCompleta(id, empresaId, alcance);
    if (!certificacion) throw new InspeccionNoEncontradaError(id);
    return certificacion;
  }
}
