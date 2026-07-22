import { generarHallazgosDesdeDetalles } from "../../domain/hallazgo.entity";
import { construirRutaAlmacenamiento, tamanoArchivoValido, tipoArchivoPermitido } from "../../domain/evidencia.entity";
import { ArchivoNoPermitidoError, HallazgoNoEncontradoError, InspeccionNoEncontradaError } from "../../domain/inspeccion.errors";
import type { AlmacenamientoEvidenciasPort } from "../../domain/almacenamiento-evidencias.port";
import type { AlcanceConsulta, CertificacionRepositoryPort } from "../../domain/certificacion.repository.port";
import type { HallazgoRepositoryPort } from "../../domain/hallazgo.repository.port";
import type { ActualizarHallazgoInput, CrearHallazgoInput } from "../hallazgo.schema";
import type { ArchivoSubido } from "./responder-certificacion.usecase";

/**
 * Gestiona el registro de hallazgos de una certificación: automáticos (desde respuestas
 * incumplidas) y manuales (agregados por el auditor), con sus evidencias.
 */
export class GestionarHallazgosUseCase {
  constructor(
    private readonly repo: HallazgoRepositoryPort,
    private readonly certificacionRepo: CertificacionRepositoryPort,
    private readonly almacenamiento: AlmacenamientoEvidenciasPort,
  ) {}

  async listar(inspeccionId: string, empresaId: string, alcance?: AlcanceConsulta) {
    await this.validarAcceso(inspeccionId, empresaId, alcance);
    return this.repo.listarPorInspeccion(inspeccionId, empresaId);
  }

  async crearManual(inspeccionId: string, empresaId: string, input: CrearHallazgoInput, alcance?: AlcanceConsulta) {
    await this.validarAcceso(inspeccionId, empresaId, alcance);
    return this.repo.crear({
      inspeccionId,
      empresaId,
      descripcion: input.descripcion,
      severidad: input.severidad,
      detalleId: input.detalleId ?? null,
    });
  }

  /** Genera un hallazgo por cada respuesta incumplida que todavía no tiene uno — idempotente. */
  async generarAutomaticos(inspeccionId: string, empresaId: string, alcance?: AlcanceConsulta) {
    const certificacion = await this.validarAcceso(inspeccionId, empresaId, alcance);
    const yaGenerados = await this.repo.listarDetalleIdsConHallazgo(inspeccionId);

    const candidatos = generarHallazgosDesdeDetalles(certificacion.detalles).filter(
      (c) => !yaGenerados.has(c.detalleId),
    );
    if (candidatos.length === 0) return [];

    return this.repo.crearVarios(
      candidatos.map((c) => ({
        inspeccionId,
        empresaId,
        descripcion: c.descripcion,
        severidad: c.severidad,
        detalleId: c.detalleId,
      })),
    );
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
