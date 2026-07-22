import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { GestionarPoliticaRetencionUseCase } from "../application/casos-uso/gestionar-politica-retencion.usecase";
import { TipoDatoRetencionInvalidoError } from "../domain/politica-retencion.errors";
import type { PoliticaRetencionRepositoryPort } from "../domain/politica-retencion.repository.port";

function crearRepoMock(): PoliticaRetencionRepositoryPort & Record<string, Mock> {
  return { obtenerPorEmpresa: vi.fn(), actualizar: vi.fn() } as unknown as PoliticaRetencionRepositoryPort & Record<string, Mock>;
}

describe("GestionarPoliticaRetencionUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let uc: GestionarPoliticaRetencionUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    uc = new GestionarPoliticaRetencionUseCase(repo);
  });

  it("obtenerPorEmpresa() delega en el repo", async () => {
    repo.obtenerPorEmpresa.mockResolvedValue([]);
    await uc.obtenerPorEmpresa("e1");
    expect(repo.obtenerPorEmpresa).toHaveBeenCalledWith("e1");
  });

  it("actualizar() llama repo.actualizar(empresaId, tipoDato, datos) con los valores correctos", async () => {
    repo.actualizar.mockResolvedValue({ id: "p1", empresaId: "e1", tipoDato: "EVIDENCIA", mesesRetencion: 12, accionAlVencer: "ELIMINAR", actualizadoEn: new Date() });

    await uc.actualizar("e1", "EVIDENCIA", { mesesRetencion: 12, accionAlVencer: "ELIMINAR" });

    expect(repo.actualizar).toHaveBeenCalledWith("e1", "EVIDENCIA", { mesesRetencion: 12, accionAlVencer: "ELIMINAR" });
  });

  it("actualizar() lanza TipoDatoRetencionInvalidoError con un tipoDato que no existe en el catálogo", async () => {
    await expect(
      uc.actualizar("e1", "TIPO_INEXISTENTE", { mesesRetencion: 12, accionAlVencer: "ELIMINAR" }),
    ).rejects.toThrow(TipoDatoRetencionInvalidoError);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });
});
