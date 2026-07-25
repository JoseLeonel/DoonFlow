import { puedeResolver, yaFueResuelta } from "../../domain/apelacion.entity";
import {
  ApelacionNoEncontradaError,
  ApelacionSeparacionFuncionesError,
  ApelacionYaResueltaError,
} from "../../domain/apelacion.errors";
import type { ApelacionRepositoryPort } from "../../domain/apelacion.repository.port";
import type { PuertoCertificacionParaApelaciones } from "../../domain/puerto-certificacion.port";
import type { ResolverApelacionInput } from "../apelacion.schema";

/**
 * Un auditor/administrador (distinto de quien firmó la certificación) resuelve una apelación:
 * aceptarla (anula el hallazgo y recalcula `resultadoFinal` si era `SOBRE_HALLAZGO`) o
 * rechazarla, siempre con justificación (011-aceptacion-apelaciones-certificacion, HU-3).
 */
export class ResolverApelacionUseCase {
  constructor(
    private readonly repo: ApelacionRepositoryPort,
    private readonly puertoCertificacion: PuertoCertificacionParaApelaciones,
  ) {}

  async ejecutar(id: string, empresaId: string, resolutorId: string, input: ResolverApelacionInput) {
    const apelacion = await this.repo.obtenerPorId(id, empresaId);
    if (!apelacion) throw new ApelacionNoEncontradaError(id);
    if (yaFueResuelta(apelacion)) throw new ApelacionYaResueltaError();

    const certificacion = await this.puertoCertificacion.obtenerCertificacion(apelacion.inspeccionId, empresaId);
    if (!certificacion) throw new ApelacionNoEncontradaError(id);
    if (!puedeResolver(resolutorId, certificacion.firmadoPorId)) throw new ApelacionSeparacionFuncionesError();

    const resuelta = await this.repo.resolver(id, empresaId, {
      estado: input.estado,
      resueltoPorId: resolutorId,
      resolucionComentario: input.resolucionComentario,
    });

    if (input.estado === "ACEPTADA" && apelacion.tipo === "SOBRE_HALLAZGO" && apelacion.hallazgoId) {
      await this.puertoCertificacion.anularHallazgoPorApelacion(apelacion.hallazgoId, empresaId);
      await this.puertoCertificacion.recalcularResultadoFinal(apelacion.inspeccionId, empresaId);
    }

    return resuelta;
  }
}
