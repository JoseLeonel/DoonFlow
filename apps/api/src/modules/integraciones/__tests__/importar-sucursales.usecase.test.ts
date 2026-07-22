import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { ImportarSucursalesUseCase } from "../application/casos-uso/importar-sucursales.usecase";
import type { GestionarSucursalUseCase } from "../../sucursales/application/casos-uso/gestionar-sucursal.usecase";
import type { ClienteRepositoryPort } from "../../clientes/domain/cliente.repository.port";
import type { ImportacionLoteRepositoryPort } from "../domain/importacion-lote.repository.port";

describe("ImportarSucursalesUseCase", () => {
  let sucursalUseCase: { crear: Mock };
  let clienteRepo: ClienteRepositoryPort & Record<string, Mock>;
  let loteRepo: ImportacionLoteRepositoryPort & Record<string, Mock>;
  let uc: ImportarSucursalesUseCase;

  beforeEach(() => {
    sucursalUseCase = { crear: vi.fn().mockResolvedValue({ id: "s1" }) };
    clienteRepo = {
      listar: vi.fn(), obtenerPorId: vi.fn(), crear: vi.fn(), actualizar: vi.fn(),
      cambiarEstado: vi.fn(), existeIdentificacion: vi.fn(),
      buscarPorIdentificacion: vi.fn().mockResolvedValue({ id: "c1", empresa: "Empresa X" }),
    } as unknown as ClienteRepositoryPort & Record<string, Mock>;
    loteRepo = {
      crear: vi.fn().mockImplementation((empresaId, usuarioId, datos) => Promise.resolve({ id: "lote1", empresaId, creadoPorId: usuarioId, ...datos })),
      listar: vi.fn(), obtenerPorId: vi.fn(),
    } as unknown as ImportacionLoteRepositoryPort & Record<string, Mock>;

    uc = new ImportarSucursalesUseCase(loteRepo, sucursalUseCase as unknown as GestionarSucursalUseCase, clienteRepo);
  });

  it("importación con identificacionCliente que no existe → fila reportada, no lanza excepción no controlada", async () => {
    clienteRepo.buscarPorIdentificacion.mockResolvedValue(null);

    const lote = await uc.importar("e1", "u1", "sucursales.xlsx", [
      { fila: 2, datos: { identificacionCliente: "NO-EXISTE", nombre: "Sucursal Fantasma" } },
    ]);

    expect(lote.filasExitosas).toBe(0);
    expect(lote.filasConError).toBe(1);
    expect(lote.detalleErrores?.[0]?.error).toMatch(/No existe un cliente/);
    expect(sucursalUseCase.crear).not.toHaveBeenCalled();
  });

  it("resuelve clienteId por identificacionCliente y llama sucursalUseCase.crear() con ese id", async () => {
    await uc.importar("e1", "u1", "sucursales.xlsx", [
      { fila: 2, datos: { identificacionCliente: "ID-1", nombre: "Planta Central" } },
    ]);

    expect(sucursalUseCase.crear).toHaveBeenCalledWith("e1", expect.objectContaining({ clienteId: "c1", nombre: "Planta Central" }));
  });

  it("previsualizar() no invoca crear() del caso de uso subyacente (dry-run real)", async () => {
    await uc.previsualizar("e1", [{ fila: 2, datos: { identificacionCliente: "ID-1", nombre: "Planta Central" } }]);

    expect(sucursalUseCase.crear).not.toHaveBeenCalled();
  });
});
