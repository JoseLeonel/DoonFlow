import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mocked } from "vitest";
import { GestionarHallazgoFrecuenteUseCase } from "../application/casos-uso/gestionar-hallazgo-frecuente.usecase";
import { HallazgoFrecuenteNoEncontradoError } from "../domain/hallazgo-frecuente.errors";
import type { HallazgoFrecuenteRepositoryPort } from "../domain/hallazgo-frecuente.repository.port";

function hallazgoFrecuente(overrides: Partial<{ activo: boolean }> = {}) {
  return {
    id: "h1", descripcionHallazgo: "Extintor vencido", severidadSugerida: "CRITICA" as const,
    descripcionAccionSugerida: "Sustituir el extintor", activo: overrides.activo ?? true,
    empresaId: "e1", creadoEn: new Date(), actualizadoEn: new Date(),
  };
}

describe("GestionarHallazgoFrecuenteUseCase", () => {
  let repo: Mocked<HallazgoFrecuenteRepositoryPort>;
  let uc: GestionarHallazgoFrecuenteUseCase;

  beforeEach(() => {
    repo = { listar: vi.fn(), obtenerPorId: vi.fn(), crear: vi.fn(), actualizar: vi.fn(), cambiarEstado: vi.fn() };
    uc = new GestionarHallazgoFrecuenteUseCase(repo);
  });

  it("crear() llama repo.crear() con los datos del input", async () => {
    repo.crear.mockResolvedValue(hallazgoFrecuente());
    await uc.crear("e1", { descripcionHallazgo: "Extintor vencido", severidadSugerida: "CRITICA", descripcionAccionSugerida: "Sustituir el extintor" });
    expect(repo.crear).toHaveBeenCalledWith({
      empresaId: "e1", descripcionHallazgo: "Extintor vencido", severidadSugerida: "CRITICA", descripcionAccionSugerida: "Sustituir el extintor",
    });
  });

  it("actualizar() lanza HallazgoFrecuenteNoEncontradoError si no existe", async () => {
    repo.obtenerPorId.mockResolvedValue(null);
    await expect(uc.actualizar("h1", "e1", { descripcionHallazgo: "x" })).rejects.toThrow(HallazgoFrecuenteNoEncontradoError);
  });

  it("desactivar() llama repo.cambiarEstado(id, empresaId, false)", async () => {
    repo.obtenerPorId.mockResolvedValue(hallazgoFrecuente());
    repo.cambiarEstado.mockResolvedValue(hallazgoFrecuente({ activo: false }));
    await uc.desactivar("h1", "e1");
    expect(repo.cambiarEstado).toHaveBeenCalledWith("h1", "e1", false);
  });

  it("activar() llama repo.cambiarEstado(id, empresaId, true)", async () => {
    repo.obtenerPorId.mockResolvedValue(hallazgoFrecuente({ activo: false }));
    repo.cambiarEstado.mockResolvedValue(hallazgoFrecuente());
    await uc.activar("h1", "e1");
    expect(repo.cambiarEstado).toHaveBeenCalledWith("h1", "e1", true);
  });
});
