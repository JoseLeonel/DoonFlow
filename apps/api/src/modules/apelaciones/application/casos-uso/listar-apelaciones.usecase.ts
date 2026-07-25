import { InspeccionNoEncontradaError } from "../../domain/apelacion.errors";
import type { ApelacionRepositoryPort } from "../../domain/apelacion.repository.port";
import type { PuertoCertificacionParaApelaciones } from "../../domain/puerto-certificacion.port";

/**
 * Consultas de apelaciones: la cola de abiertas (para quien resuelve) y el historial completo
 * de una certificación (para mostrarlo dentro de su detalle).
 */
export class ListarApelacionesUseCase {
  constructor(
    private readonly repo: ApelacionRepositoryPort,
    private readonly puertoCertificacion: PuertoCertificacionParaApelaciones,
  ) {}

  listarAbiertas(empresaId: string) {
    return this.repo.listarAbiertas(empresaId);
  }

  async listarPorInspeccion(inspeccionId: string, empresaId: string, alcance?: unknown) {
    const certificacion = await this.puertoCertificacion.obtenerCertificacion(inspeccionId, empresaId, alcance);
    if (!certificacion) throw new InspeccionNoEncontradaError(inspeccionId);
    return this.repo.listarPorInspeccion(inspeccionId, empresaId);
  }

  obtenerPorId(id: string, empresaId: string) {
    return this.repo.obtenerPorId(id, empresaId);
  }
}
