import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { GestionarSucursalUseCase } from "../application/casos-uso/gestionar-sucursal.usecase";
import { ClienteNoEncontradoError, CorreoInvalidoError, SucursalNoEncontradaError } from "../domain/sucursal.errors";
import type { SucursalRepositoryPort } from "../domain/sucursal.repository.port";
import type { ClienteRepositoryPort } from "../../clientes/domain/cliente.repository.port";
import type { Sucursal } from "../domain/sucursal.entity";
import type { Cliente } from "../../clientes/domain/cliente.entity";

function crearRepoMock(): SucursalRepositoryPort & Record<string, Mock> {
  return {
    listarPorCliente: vi.fn(),
    obtenerPorId: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    cambiarEstado: vi.fn(),
    obtenerHistoricoCertificaciones: vi.fn(),
    obtenerPuntajeVigente: vi.fn(),
  } as unknown as SucursalRepositoryPort & Record<string, Mock>;
}

function crearClienteRepoMock(): ClienteRepositoryPort & Record<string, Mock> {
  return {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    cambiarEstado: vi.fn(),
    existeIdentificacion: vi.fn(),
  } as unknown as ClienteRepositoryPort & Record<string, Mock>;
}

function sucursal(parcial: Partial<Sucursal> = {}): Sucursal {
  return {
    id: "s1",
    empresaId: "e1",
    clienteId: "c1",
    nombre: "Planta Central",
    activo: true,
    creadoEn: new Date("2026-01-01"),
    actualizadoEn: new Date("2026-01-01"),
    ...parcial,
  };
}

function cliente(parcial: Partial<Cliente> = {}): Cliente {
  return {
    id: "c1",
    empresaId: "e1",
    nombreResponsable: "Ana Pérez",
    empresa: "Distribuidora Sur S.A.",
    correo1: "contacto@distsur.com",
    activo: true,
    creadoEn: new Date("2026-01-01"),
    actualizadoEn: new Date("2026-01-01"),
    ...parcial,
  };
}

describe("GestionarSucursalUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let clienteRepo: ReturnType<typeof crearClienteRepoMock>;
  let uc: GestionarSucursalUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    clienteRepo = crearClienteRepoMock();
    uc = new GestionarSucursalUseCase(repo, clienteRepo);
  });

  describe("crear", () => {
    it("llama repo.crear() con los datos del input cuando el cliente existe", async () => {
      clienteRepo.obtenerPorId.mockResolvedValue(cliente());
      repo.crear.mockResolvedValue(sucursal());

      await uc.crear("e1", { nombre: "Planta Central", clienteId: "c1" });

      expect(repo.crear).toHaveBeenCalledWith({ nombre: "Planta Central", clienteId: "c1", empresaId: "e1" });
    });

    it("lanza CorreoInvalidoError si el correo tiene formato inválido", async () => {
      await expect(
        uc.crear("e1", { nombre: "Planta Central", clienteId: "c1", correo: "invalido" }),
      ).rejects.toThrow(CorreoInvalidoError);
      expect(clienteRepo.obtenerPorId).not.toHaveBeenCalled();
    });

    it("lanza ClienteNoEncontradoError si el clienteId no existe en la empresa", async () => {
      clienteRepo.obtenerPorId.mockResolvedValue(null);

      await expect(
        uc.crear("e1", { nombre: "Planta Central", clienteId: "c-inexistente" }),
      ).rejects.toThrow(ClienteNoEncontradoError);
    });
  });

  describe("obtenerPorId", () => {
    it("lanza SucursalNoEncontradaError si el repo retorna null", async () => {
      repo.obtenerPorId.mockResolvedValue(null);
      await expect(uc.obtenerPorId("s1", "e1")).rejects.toThrow(SucursalNoEncontradaError);
    });
  });

  describe("actualizar", () => {
    it("lanza SucursalNoEncontradaError si no existe", async () => {
      repo.obtenerPorId.mockResolvedValue(null);
      await expect(uc.actualizar("s1", "e1", { nombre: "Nuevo nombre" })).rejects.toThrow(SucursalNoEncontradaError);
    });
  });

  describe("activar / desactivar", () => {
    it("activar() llama repo.cambiarEstado(id, empresaId, true)", async () => {
      repo.obtenerPorId.mockResolvedValue(sucursal());
      repo.cambiarEstado.mockResolvedValue(sucursal({ activo: true }));

      await uc.activar("s1", "e1");

      expect(repo.cambiarEstado).toHaveBeenCalledWith("s1", "e1", true);
    });

    it("desactivar() llama repo.cambiarEstado(id, empresaId, false)", async () => {
      repo.obtenerPorId.mockResolvedValue(sucursal());
      repo.cambiarEstado.mockResolvedValue(sucursal({ activo: false }));

      await uc.desactivar("s1", "e1");

      expect(repo.cambiarEstado).toHaveBeenCalledWith("s1", "e1", false);
    });
  });

  describe("obtenerHistorico", () => {
    it("combina registros y puntaje vigente", async () => {
      repo.obtenerPorId.mockResolvedValue(sucursal());
      repo.obtenerHistoricoCertificaciones.mockResolvedValue([
        { fecha: "2026-06-15", plantillaNombre: "BPM", puntajeObtenido: 92, puntajeMaximo: 100, clasificacion: "Excelente" },
      ]);
      repo.obtenerPuntajeVigente.mockResolvedValue({ puntaje: 92, clasificacion: "Excelente" });

      const resultado = await uc.obtenerHistorico("s1", "e1");

      expect(resultado.registros).toHaveLength(1);
      expect(resultado.puntajeVigente).toEqual({ puntaje: 92, clasificacion: "Excelente" });
    });

    it("retorna puntajeVigente: null y registros: [] si la sucursal no tiene inspecciones", async () => {
      repo.obtenerPorId.mockResolvedValue(sucursal());
      repo.obtenerHistoricoCertificaciones.mockResolvedValue([]);
      repo.obtenerPuntajeVigente.mockResolvedValue(null);

      const resultado = await uc.obtenerHistorico("s1", "e1");

      expect(resultado.registros).toEqual([]);
      expect(resultado.puntajeVigente).toBeNull();
    });
  });
});
