import { PLAZO_APELACION_DIAS } from "@doonflow/shared";
import { puedeApelar } from "../../domain/apelacion.entity";
import {
  CertificacionNoFirmadaError,
  CertificacionVencidaError,
  HallazgoDeApelacionNoEncontradoError,
  PlazoApelacionVencidoError,
} from "../../domain/apelacion.errors";
import type { ApelacionRepositoryPort } from "../../domain/apelacion.repository.port";
import type { PuertoCertificacionParaApelaciones } from "../../domain/puerto-certificacion.port";
import type { CrearApelacionInput } from "../apelacion.schema";

/**
 * El cliente presenta una apelación sobre un hallazgo puntual o sobre el resultado general de
 * una certificación firmada, dentro del plazo (011-aceptacion-apelaciones-certificacion, HU-2).
 */
export class PresentarApelacionUseCase {
  constructor(
    private readonly repo: ApelacionRepositoryPort,
    private readonly puertoCertificacion: PuertoCertificacionParaApelaciones,
  ) {}

  async ejecutar(empresaId: string, usuarioId: string, input: CrearApelacionInput, alcance?: unknown) {
    const certificacion = await this.puertoCertificacion.obtenerCertificacion(input.inspeccionId, empresaId, alcance);
    if (!certificacion || certificacion.estado !== "FIRMADA" || !certificacion.firmadoEn) {
      throw new CertificacionNoFirmadaError();
    }

    const ahora = new Date();
    if (certificacion.fechaVencimiento && certificacion.fechaVencimiento < ahora) {
      throw new CertificacionVencidaError();
    }
    if (!puedeApelar(certificacion, ahora, PLAZO_APELACION_DIAS)) {
      throw new PlazoApelacionVencidoError();
    }

    if (input.tipo === "SOBRE_HALLAZGO") {
      const hallazgo = await this.puertoCertificacion.obtenerHallazgo(input.hallazgoId!, empresaId);
      if (!hallazgo || hallazgo.inspeccionId !== input.inspeccionId) {
        throw new HallazgoDeApelacionNoEncontradoError(input.hallazgoId!);
      }
    }

    return this.repo.crear({
      empresaId,
      inspeccionId: input.inspeccionId,
      hallazgoId: input.tipo === "SOBRE_HALLAZGO" ? input.hallazgoId! : null,
      tipo: input.tipo,
      motivo: input.motivo,
      solicitadoPorId: usuarioId,
    });
  }
}
