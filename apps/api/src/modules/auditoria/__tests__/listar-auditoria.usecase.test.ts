import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { ListarAuditoriaUseCase } from "../application/casos-uso/listar-auditoria.usecase";
import type { RegistroAuditoriaRepositoryPort } from "../domain/registro-auditoria.repository.port";

function crearRepoMock(): RegistroAuditoriaRepositoryPort & Record<string, Mock> {
  return { registrar: vi.fn(), listar: vi.fn() } as unknown as RegistroAuditoriaRepositoryPort & Record<string, Mock>;
}

describe("ListarAuditoriaUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let uc: ListarAuditoriaUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    uc = new ListarAuditoriaUseCase(repo);
    repo.listar.mockResolvedValue({ items: [], total: 0 });
  });

  it("aplica pagina/porPagina por defecto 1/20 cuando no se envían", async () => {
    await uc.listar("e1", {});

    expect(repo.listar).toHaveBeenCalledWith("e1", {}, { pagina: 1, porPagina: 20 });
  });

  it("respeta pagina/porPagina explícitos", async () => {
    await uc.listar("e1", { accion: "LOGIN" }, { pagina: 3, porPagina: 10 });

    expect(repo.listar).toHaveBeenCalledWith("e1", { accion: "LOGIN" }, { pagina: 3, porPagina: 10 });
  });
});
