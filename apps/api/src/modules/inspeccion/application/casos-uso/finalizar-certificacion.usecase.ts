import { puedeFinalizarse } from "../../domain/certificacion.entity";
import { CertificacionNoEditableError, InspeccionNoEncontradaError, SincronizacionPendienteError } from "../../domain/inspeccion.errors";
import type { AlcanceConsulta, CertificacionRepositoryPort } from "../../domain/certificacion.repository.port";
import type { FinalizarCertificacionInput } from "../certificacion.schema";
import type { GestionarHallazgosUseCase } from "./gestionar-hallazgos.usecase";

/**
 * Cierre liviano de una certificación ("Guardar y finalizar", 2026-07-24) — a diferencia de
 * `FirmarCertificacionUseCase`, no genera PDF ni código de verificación/vigencia y no bloquea
 * por hallazgo crítico sin resolver: solo cierra la captura de respuestas y genera los
 * hallazgos automáticos correspondientes, dejando la certificación lista para armar su plan de
 * cumplimiento. Antes de esto, "Guardar y finalizar" no llamaba al backend en absoluto.
 */
export class FinalizarCertificacionUseCase {
  constructor(
    private readonly repo: CertificacionRepositoryPort,
    private readonly gestionarHallazgos?: GestionarHallazgosUseCase,
  ) {}

  async ejecutar(
    id: string,
    empresaId: string,
    input: FinalizarCertificacionInput,
    alcance?: AlcanceConsulta,
  ) {
    const certificacion = await this.repo.obtenerCompleta(id, empresaId, alcance);
    if (!certificacion) throw new InspeccionNoEncontradaError(id);
    if (certificacion.estado !== "EN_PROGRESO") throw new CertificacionNoEditableError();
    if (!puedeFinalizarse(certificacion, input.pendientesSincronizacion)) {
      throw new SincronizacionPendienteError(input.pendientesSincronizacion);
    }

    if (this.gestionarHallazgos) {
      await this.gestionarHallazgos.generarAutomaticos(id, empresaId, alcance);
    }

    return this.repo.finalizar(id);
  }
}
