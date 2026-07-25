import { HallazgoFrecuenteNoEncontradoError } from "../../domain/hallazgo-frecuente.errors";
import type { FiltrosHallazgoFrecuente, HallazgoFrecuenteRepositoryPort } from "../../domain/hallazgo-frecuente.repository.port";
import type { ActualizarHallazgoFrecuenteInput, CrearHallazgoFrecuenteInput } from "../hallazgo-frecuente.schema";

/** Gestiona la biblioteca de hallazgos frecuentes (014-panel-calendario-biblioteca, HU-6). */
export class GestionarHallazgoFrecuenteUseCase {
  constructor(private readonly repo: HallazgoFrecuenteRepositoryPort) {}

  listar(empresaId: string, filtros: FiltrosHallazgoFrecuente) {
    return this.repo.listar(empresaId, filtros);
  }

  crear(empresaId: string, input: CrearHallazgoFrecuenteInput) {
    return this.repo.crear({ ...input, empresaId });
  }

  async actualizar(id: string, empresaId: string, input: ActualizarHallazgoFrecuenteInput) {
    await this.obtener(id, empresaId);
    return this.repo.actualizar(id, empresaId, input);
  }

  async activar(id: string, empresaId: string) {
    await this.obtener(id, empresaId);
    return this.repo.cambiarEstado(id, empresaId, true);
  }

  async desactivar(id: string, empresaId: string) {
    await this.obtener(id, empresaId);
    return this.repo.cambiarEstado(id, empresaId, false);
  }

  private async obtener(id: string, empresaId: string) {
    const existente = await this.repo.obtenerPorId(id, empresaId);
    if (!existente) throw new HallazgoFrecuenteNoEncontradoError(id);
    return existente;
  }
}
