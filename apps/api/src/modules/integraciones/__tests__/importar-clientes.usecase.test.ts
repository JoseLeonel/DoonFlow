import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock, Mocked } from "vitest";
import { ImportarClientesUseCase } from "../application/casos-uso/importar-clientes.usecase";
import type { GestionarClienteUseCase } from "../../clientes/application/casos-uso/gestionar-cliente.usecase";
import type { ClienteRepositoryPort } from "../../clientes/domain/cliente.repository.port";
import type { ImportacionLoteRepositoryPort } from "../domain/importacion-lote.repository.port";

function filaValida(identificacion = "ID-1") {
  return { nombreResponsable: "Ana", empresa: "Empresa X", identificacionEmpresa: identificacion, correo1: "ana@x.com" };
}

describe("ImportarClientesUseCase", () => {
  let clienteUseCase: { crear: Mock };
  let clienteRepo: Mocked<ClienteRepositoryPort>;
  let loteRepo: Mocked<ImportacionLoteRepositoryPort>;
  let uc: ImportarClientesUseCase;

  beforeEach(() => {
    clienteUseCase = { crear: vi.fn().mockResolvedValue({ id: "c1" }) };
    clienteRepo = {
      listar: vi.fn(), obtenerPorId: vi.fn(), crear: vi.fn(), actualizar: vi.fn(),
      cambiarEstado: vi.fn(), existeIdentificacion: vi.fn().mockResolvedValue(false),
      buscarPorIdentificacion: vi.fn(),
    };
    loteRepo = {
      crear: vi.fn().mockImplementation((empresaId, usuarioId, datos) => Promise.resolve({ id: "lote1", empresaId, creadoPorId: usuarioId, ...datos })),
      listar: vi.fn(), obtenerPorId: vi.fn(),
    } as unknown as Mocked<ImportacionLoteRepositoryPort>;

    uc = new ImportarClientesUseCase(loteRepo, clienteUseCase as unknown as GestionarClienteUseCase, clienteRepo);
  });

  it("con 2 filas válidas y 1 con correo inválido → filasExitosas: 2, filasConError: 1", async () => {
    const filas = [
      { fila: 2, datos: filaValida("ID-1") },
      { fila: 3, datos: filaValida("ID-2") },
      { fila: 4, datos: { nombreResponsable: "Mal", empresa: "Empresa Y", correo1: "no-es-correo" } },
    ];

    const lote = await uc.importar("e1", "u1", "clientes.xlsx", filas);

    expect(lote.filasExitosas).toBe(2);
    expect(lote.filasConError).toBe(1);
    expect(clienteUseCase.crear).toHaveBeenCalledTimes(2);
  });

  it("una fila con identificación duplicada se reporta como error de fila, sin interrumpir las demás", async () => {
    clienteUseCase.crear
      .mockResolvedValueOnce({ id: "c1" })
      .mockRejectedValueOnce(new Error("Ya existe un cliente con esa identificación en esta empresa."));

    const filas = [
      { fila: 2, datos: filaValida("ID-1") },
      { fila: 3, datos: filaValida("ID-1") },
    ];

    const lote = await uc.importar("e1", "u1", "clientes.xlsx", filas);

    expect(lote.filasExitosas).toBe(1);
    expect(lote.filasConError).toBe(1);
    expect(clienteUseCase.crear).toHaveBeenCalledTimes(2);
  });

  it("previsualizar() no invoca crear() del caso de uso subyacente (dry-run real)", async () => {
    const filas = [{ fila: 2, datos: filaValida("ID-1") }];

    await uc.previsualizar("e1", filas);

    expect(clienteUseCase.crear).not.toHaveBeenCalled();
  });

  it("previsualizar() reporta error si existeIdentificacion() retorna true", async () => {
    clienteRepo.existeIdentificacion.mockResolvedValue(true);

    const resultado = await uc.previsualizar("e1", [{ fila: 2, datos: filaValida("ID-1") }]);

    expect(resultado.filasValidas).toHaveLength(0);
    expect(resultado.filasConError).toHaveLength(1);
  });
});
