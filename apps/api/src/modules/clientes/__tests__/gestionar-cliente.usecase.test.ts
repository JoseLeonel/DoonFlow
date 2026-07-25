import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mocked } from "vitest";
import { GestionarClienteUseCase } from "../application/casos-uso/gestionar-cliente.usecase";
import type { ClienteRepositoryPort } from "../domain/cliente.repository.port";

function crearRepoMock(): Mocked<ClienteRepositoryPort> {
  return {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    cambiarEstado: vi.fn(),
    existeIdentificacion: vi.fn(),
    buscarPorIdentificacion: vi.fn(),
  };
}

describe("GestionarClienteUseCase — paginación (010-seguridad-privacidad-continuidad)", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let uc: GestionarClienteUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    uc = new GestionarClienteUseCase(repo);
    repo.listar.mockResolvedValue({ items: [], total: 0 });
  });

  it("listar() usa pagina=1/porPagina=20 por defecto cuando no se especifican", async () => {
    await uc.listar("e1", undefined);

    expect(repo.listar).toHaveBeenCalledWith("e1", undefined, { pagina: 1, porPagina: 20 });
  });

  it("listar() respeta pagina/porPagina explícitos y el alcance del usuario", async () => {
    const alcance = { tipo: "CLIENTE" as const, clienteId: "c1" };
    await uc.listar("e1", alcance, { pagina: 2, porPagina: 10 });

    expect(repo.listar).toHaveBeenCalledWith("e1", alcance, { pagina: 2, porPagina: 10 });
  });
});
