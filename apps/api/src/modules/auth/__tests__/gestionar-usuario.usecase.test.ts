import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { GestionarUsuarioUseCase } from "../application/casos-uso/gestionar-usuario.usecase";
import {
  AlcanceInvalidoError,
  EmailDuplicadoError,
  SucursalRequeridaError,
  UsuarioNoEncontradoError,
} from "../domain/auth.errors";
import type { RolRepositoryPort } from "../domain/rol.repository.port";
import type { UsuarioDetalle, UsuarioRepositoryPort } from "../domain/usuario.repository.port";

function crearRepoMock(): UsuarioRepositoryPort & Record<string, Mock> {
  return {
    buscarPorAuthUserId: vi.fn(),
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    buscarPorEmail: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    cambiarEstado: vi.fn(),
    obtenerSucursalesAdicionales: vi.fn(),
    reemplazarSucursalesAdicionales: vi.fn(),
  } as unknown as UsuarioRepositoryPort & Record<string, Mock>;
}

function crearRolRepoMock(): RolRepositoryPort & Record<string, Mock> {
  return {
    obtenerPorId: vi.fn(),
    listar: vi.fn(),
  } as unknown as RolRepositoryPort & Record<string, Mock>;
}

function usuarioDetalle(parcial: Partial<UsuarioDetalle> = {}): UsuarioDetalle {
  return {
    id: "u1",
    empresaId: "e1",
    email: "carlos@dist.com",
    nombre: "Carlos Mora",
    rolId: "rol-admin-cliente",
    rolNombre: "administrador_cliente",
    clienteId: "c1",
    clienteNombre: "Distribuidora Sur S.A.",
    sucursalId: null,
    sucursalNombre: null,
    sucursalesAdicionales: [],
    activo: true,
    creadoEn: new Date("2026-01-01"),
    actualizadoEn: new Date("2026-01-01"),
    ...parcial,
  };
}

describe("GestionarUsuarioUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let rolRepo: ReturnType<typeof crearRolRepoMock>;
  let uc: GestionarUsuarioUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    rolRepo = crearRolRepoMock();
    uc = new GestionarUsuarioUseCase(repo, rolRepo);
  });

  describe("crear", () => {
    it("crea un administrador (rol TOTAL) sin clienteId ni sucursalId", async () => {
      rolRepo.obtenerPorId.mockResolvedValue({ id: "rol-admin", nombre: "administrador" });
      repo.buscarPorEmail.mockResolvedValue(null);
      repo.crear.mockResolvedValue(usuarioDetalle({ rolNombre: "administrador", clienteId: null }));

      await uc.crear("e1", { nombre: "Ana", email: "ana@doonflow.demo", password: "Admin2026!", rolId: "rol-admin" });

      expect(repo.crear).toHaveBeenCalledWith(
        expect.objectContaining({ clienteId: null, sucursalId: null }),
        [],
      );
    });

    it("crea un administrador_cliente con clienteId", async () => {
      rolRepo.obtenerPorId.mockResolvedValue({ id: "rol-ac", nombre: "administrador_cliente" });
      repo.buscarPorEmail.mockResolvedValue(null);
      repo.crear.mockResolvedValue(usuarioDetalle());

      await uc.crear("e1", { nombre: "Carlos", email: "carlos@dist.com", password: "Cliente2026!", rolId: "rol-ac", clienteId: "c1" });

      expect(repo.crear).toHaveBeenCalledWith(expect.objectContaining({ clienteId: "c1", sucursalId: null }), []);
    });

    it("crea un usuario_sucursal con sucursalId", async () => {
      rolRepo.obtenerPorId.mockResolvedValue({ id: "rol-us", nombre: "usuario_sucursal" });
      repo.buscarPorEmail.mockResolvedValue(null);
      repo.crear.mockResolvedValue(usuarioDetalle({ rolNombre: "usuario_sucursal", clienteId: null, sucursalId: "s1" }));

      await uc.crear("e1", { nombre: "Lucía", email: "lucia@dist.com", password: "Cliente2026!", rolId: "rol-us", sucursalId: "s1" });

      expect(repo.crear).toHaveBeenCalledWith(expect.objectContaining({ clienteId: null, sucursalId: "s1" }), []);
    });

    it("lanza EmailDuplicadoError si buscarPorEmail retorna un usuario", async () => {
      rolRepo.obtenerPorId.mockResolvedValue({ id: "rol-admin", nombre: "administrador" });
      repo.buscarPorEmail.mockResolvedValue({ id: "existente" });

      await expect(
        uc.crear("e1", { nombre: "Ana", email: "ana@doonflow.demo", password: "Admin2026!", rolId: "rol-admin" }),
      ).rejects.toThrow(EmailDuplicadoError);
    });

    it("lanza AlcanceInvalidoError si clienteId/sucursalId no corresponden al rol", async () => {
      rolRepo.obtenerPorId.mockResolvedValue({ id: "rol-admin", nombre: "administrador" });

      await expect(
        uc.crear("e1", { nombre: "Ana", email: "ana@doonflow.demo", password: "Admin2026!", rolId: "rol-admin", clienteId: "c1" }),
      ).rejects.toThrow(AlcanceInvalidoError);
    });

    it("lanza SucursalRequeridaError si rol=usuario_sucursal sin sucursalId ni adicionales", async () => {
      rolRepo.obtenerPorId.mockResolvedValue({ id: "rol-us", nombre: "usuario_sucursal" });

      await expect(
        uc.crear("e1", { nombre: "Lucía", email: "lucia@dist.com", password: "Cliente2026!", rolId: "rol-us" }),
      ).rejects.toThrow(SucursalRequeridaError);
    });
  });

  describe("actualizar / activar / desactivar", () => {
    it("actualizar() lanza UsuarioNoEncontradoError si no existe", async () => {
      repo.obtenerPorId.mockResolvedValue(null);
      await expect(uc.actualizar("u1", "e1", { nombre: "Nuevo" })).rejects.toThrow(UsuarioNoEncontradoError);
    });

    it("activar() lanza UsuarioNoEncontradoError si no existe", async () => {
      repo.obtenerPorId.mockResolvedValue(null);
      await expect(uc.activar("u1", "e1")).rejects.toThrow(UsuarioNoEncontradoError);
    });

    it("desactivar() lanza UsuarioNoEncontradoError si no existe", async () => {
      repo.obtenerPorId.mockResolvedValue(null);
      await expect(uc.desactivar("u1", "e1")).rejects.toThrow(UsuarioNoEncontradoError);
    });

    it("activar() llama repo.cambiarEstado(id, empresaId, true) cuando existe", async () => {
      repo.obtenerPorId.mockResolvedValue(usuarioDetalle());
      repo.cambiarEstado.mockResolvedValue(usuarioDetalle({ activo: true }));
      await uc.activar("u1", "e1");
      expect(repo.cambiarEstado).toHaveBeenCalledWith("u1", "e1", true);
    });
  });
});
