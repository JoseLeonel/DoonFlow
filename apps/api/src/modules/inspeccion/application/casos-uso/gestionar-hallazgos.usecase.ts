import { generarHallazgosDesdeComentarios, generarHallazgosDesdeDetalles } from "../../domain/hallazgo.entity";
import { construirRutaAlmacenamiento, tamanoArchivoValido, tipoArchivoPermitido } from "../../domain/evidencia.entity";
import { ArchivoNoPermitidoError, HallazgoNoEncontradoError, InspeccionNoEncontradaError } from "../../domain/inspeccion.errors";
import type { AlmacenamientoEvidenciasPort } from "../../domain/almacenamiento-evidencias.port";
import type { AlcanceConsulta, CertificacionRepositoryPort } from "../../domain/certificacion.repository.port";
import type { HallazgoRepositoryPort } from "../../domain/hallazgo.repository.port";
import type { ActualizarHallazgoInput, CrearHallazgoInput } from "../hallazgo.schema";
import type { ArchivoSubido } from "./responder-certificacion.usecase";
import type { NotificadorCliente } from "../../../../shared/notificaciones/registrar-notificacion";
import type { HallazgoConEvidencias } from "../../domain/hallazgo.repository.port";

/**
 * Gestiona el registro de hallazgos de una certificación: automáticos (desde respuestas
 * incumplidas) y manuales (agregados por el auditor), con sus evidencias.
 */
export class GestionarHallazgosUseCase {
  constructor(
    private readonly repo: HallazgoRepositoryPort,
    private readonly certificacionRepo: CertificacionRepositoryPort,
    private readonly almacenamiento: AlmacenamientoEvidenciasPort,
    /** 006-vigencia-notificaciones-portal — evento síncrono HALLAZGO_CRITICO, opcional para no romper tests existentes. */
    private readonly notificarCliente?: NotificadorCliente,
  ) {}

  async listar(inspeccionId: string, empresaId: string, alcance?: AlcanceConsulta) {
    await this.validarAcceso(inspeccionId, empresaId, alcance);
    return this.repo.listarPorInspeccion(inspeccionId, empresaId);
  }

  async crearManual(inspeccionId: string, empresaId: string, input: CrearHallazgoInput, alcance?: AlcanceConsulta) {
    const certificacion = await this.validarAcceso(inspeccionId, empresaId, alcance);
    const hallazgo = await this.repo.crear({
      inspeccionId,
      empresaId,
      descripcion: input.descripcion,
      categoria: input.categoria,
      severidad: input.severidad ?? null,
      detalleId: input.detalleId ?? null,
    });

    if (hallazgo.severidad === "CRITICA") {
      await this.notificarHallazgoCritico(certificacion.sucursalId, empresaId, hallazgo);
    }

    return hallazgo;
  }

  /** Genera un hallazgo de no conformidad por cada respuesta incumplida que todavía no tiene uno — idempotente. */
  async generarAutomaticos(inspeccionId: string, empresaId: string, alcance?: AlcanceConsulta) {
    const certificacion = await this.validarAcceso(inspeccionId, empresaId, alcance);
    const yaGenerados = await this.repo.listarDetalleIdsConHallazgo(inspeccionId);

    const candidatos = generarHallazgosDesdeDetalles(certificacion.detalles).filter(
      (c) => !yaGenerados.has(c.detalleId),
    );
    if (candidatos.length === 0) return [];

    const creados = await this.repo.crearVarios(
      candidatos.map((c) => ({
        inspeccionId,
        empresaId,
        descripcion: c.descripcion,
        categoria: c.categoria,
        severidad: c.severidad,
        detalleId: c.detalleId,
      })),
    );

    for (const hallazgo of creados.filter((h) => h.severidad === "CRITICA")) {
      await this.notificarHallazgoCritico(certificacion.sucursalId, empresaId, hallazgo);
    }

    return creados;
  }

  /**
   * Genera los hallazgos informativos (RECONOCIMIENTO/OBSERVACION/OPORTUNIDAD_MEJORA) a partir de
   * los 3 comentarios siempre visibles de cada pregunta — idempotente por `detalleId`+`categoria`.
   * 2026-07-25, pedido explícito del cliente: el reporte de hallazgos clasifica en estas 3
   * categorías además de las no conformidades. Nunca dispara notificación ni plan de cumplimiento.
   */
  async sincronizarComentariosCategorizados(inspeccionId: string, empresaId: string, alcance?: AlcanceConsulta) {
    const certificacion = await this.validarAcceso(inspeccionId, empresaId, alcance);
    const yaGeneradas = await this.repo.listarClavesComentarioConHallazgo(inspeccionId);

    const candidatos = generarHallazgosDesdeComentarios(certificacion.detalles).filter(
      (c) => !yaGeneradas.has(`${c.detalleId}::${c.categoria}`),
    );
    if (candidatos.length === 0) return [];

    return this.repo.crearVarios(
      candidatos.map((c) => ({
        inspeccionId,
        empresaId,
        descripcion: c.descripcion,
        categoria: c.categoria,
        severidad: null,
        detalleId: c.detalleId,
      })),
    );
  }

  private async notificarHallazgoCritico(sucursalId: string | null, empresaId: string, hallazgo: HallazgoConEvidencias) {
    if (!this.notificarCliente || !sucursalId) return;
    const sucursal = await this.certificacionRepo.obtenerSucursalParaAlcance(sucursalId, empresaId);
    if (!sucursal) return;

    await this.notificarCliente({
      clienteId: sucursal.clienteId,
      empresaId,
      tipo: "HALLAZGO_CRITICO",
      referenciaTipo: "hallazgo",
      referenciaId: hallazgo.id,
      contexto: { sucursal: sucursal.nombre },
    });
  }

  async actualizar(hallazgoId: string, empresaId: string, input: ActualizarHallazgoInput) {
    const existente = await this.repo.obtenerPorId(hallazgoId, empresaId);
    if (!existente) throw new HallazgoNoEncontradoError(hallazgoId);
    return this.repo.actualizar(hallazgoId, empresaId, input);
  }

  async adjuntarEvidencia(hallazgoId: string, empresaId: string, archivo: ArchivoSubido) {
    const hallazgo = await this.repo.obtenerPorId(hallazgoId, empresaId);
    if (!hallazgo) throw new HallazgoNoEncontradoError(hallazgoId);
    if (!tipoArchivoPermitido(archivo.mimetype) || !tamanoArchivoValido(archivo.size)) {
      throw new ArchivoNoPermitidoError();
    }

    const ruta = construirRutaAlmacenamiento(empresaId, hallazgo.inspeccionId, hallazgoId, archivo.originalname);
    const url = await this.almacenamiento.subirArchivo(ruta, archivo.buffer, archivo.mimetype);

    return this.repo.agregarEvidencia(hallazgoId, {
      tipo: archivo.mimetype,
      url,
      nombre: archivo.originalname,
      tamanoBytes: archivo.size,
    });
  }

  private async validarAcceso(inspeccionId: string, empresaId: string, alcance?: AlcanceConsulta) {
    const certificacion = await this.certificacionRepo.obtenerCompleta(inspeccionId, empresaId, alcance);
    if (!certificacion) throw new InspeccionNoEncontradaError(inspeccionId);
    return certificacion;
  }
}
