import { puedeAceptar } from "../../domain/certificacion.entity";
import { CertificacionNoFirmadaError, CertificacionYaAceptadaError, InspeccionNoEncontradaError } from "../../domain/inspeccion.errors";
import type { AlcanceConsulta, CertificacionRepositoryPort } from "../../domain/certificacion.repository.port";

/**
 * El cliente reconoce el resultado de una certificación ya firmada
 * (011-aceptacion-apelaciones-certificacion, HU-1). Es informativo: no cambia `estado` de la
 * inspección ni bloquea el uso o descarga del certificado (regla de negocio 5 de la spec).
 */
export class AceptarCertificacionUseCase {
  constructor(private readonly repo: CertificacionRepositoryPort) {}

  async ejecutar(id: string, empresaId: string, usuarioId: string, alcance?: AlcanceConsulta) {
    const certificacion = await this.repo.obtenerCompleta(id, empresaId, alcance);
    if (!certificacion) throw new InspeccionNoEncontradaError(id);

    if (certificacion.estado !== "FIRMADA") throw new CertificacionNoFirmadaError();
    if (!puedeAceptar(certificacion)) throw new CertificacionYaAceptadaError();

    return this.repo.aceptar(id, usuarioId);
  }
}
