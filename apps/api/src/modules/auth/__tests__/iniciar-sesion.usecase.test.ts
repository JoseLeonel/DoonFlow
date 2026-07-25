import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mocked } from "vitest";
import { IniciarSesionUseCase } from "../application/casos-uso/iniciar-sesion.usecase";
import {
  CredencialesInvalidasError,
  UsuarioInactivoError,
  UsuarioSinPerfilError,
} from "../domain/auth.errors";
import type { ProveedorAuthPort } from "../domain/proveedor-auth.port";
import type { UsuarioRepositoryPort } from "../domain/usuario.repository.port";
import type { UsuarioConRol } from "../domain/usuario.entity";
import type { RegistradorEventoAuditoria } from "../../../shared/auditoria/registrar-evento-auditoria";

function crearProveedorMock(): Mocked<ProveedorAuthPort> {
  return {
    verificarCredenciales: vi.fn(),
  };
}

function crearRepoMock(): Mocked<UsuarioRepositoryPort> {
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
    obtenerPasswordHash: vi.fn(),
    actualizarPasswordHash: vi.fn(),
  };
}

function usuarioConRol(parcial: Partial<UsuarioConRol> = {}): UsuarioConRol {
  return {
    id: "u1",
    empresaId: "e1",
    authUserId: "auth-1",
    email: "carlos@dist.com",
    nombre: "Carlos Mora",
    rol: "administrador",
    activo: true,
    ...parcial,
  };
}

describe("IniciarSesionUseCase", () => {
  let proveedorAuth: ReturnType<typeof crearProveedorMock>;
  let repo: ReturnType<typeof crearRepoMock>;
  let registrarEventoAuditoria: Mocked<RegistradorEventoAuditoria>;
  let uc: IniciarSesionUseCase;

  beforeEach(() => {
    proveedorAuth = crearProveedorMock();
    repo = crearRepoMock();
    registrarEventoAuditoria = vi.fn();
    uc = new IniciarSesionUseCase(proveedorAuth, repo, registrarEventoAuditoria);
  });

  it("retorna usuario + token cuando las credenciales y el perfil son válidos", async () => {
    proveedorAuth.verificarCredenciales.mockResolvedValue({ authUserId: "auth-1", tokenAcceso: "jwt-123" });
    repo.buscarPorAuthUserId.mockResolvedValue(usuarioConRol());

    const resultado = await uc.ejecutar({ email: "carlos@dist.com", password: "Admin2026!" });

    expect(resultado.tokenAcceso).toBe("jwt-123");
    expect(resultado.usuario.id).toBe("u1");
    expect(registrarEventoAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ accion: "LOGIN", usuarioId: "u1", empresaId: "e1" }),
    );
  });

  it("lanza CredencialesInvalidasError y audita LOGIN_FALLIDO si el proveedor no reconoce las credenciales", async () => {
    proveedorAuth.verificarCredenciales.mockResolvedValue(null);

    await expect(uc.ejecutar({ email: "desconocido@dist.com", password: "loquesea" })).rejects.toThrow(
      CredencialesInvalidasError,
    );

    expect(repo.buscarPorAuthUserId).not.toHaveBeenCalled();
    expect(registrarEventoAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ accion: "LOGIN_FALLIDO", usuarioId: "desconocido", empresaId: "desconocida", entidadId: "desconocido@dist.com" }),
    );
  });

  it("lanza UsuarioSinPerfilError si el proveedor autentica pero no existe perfil DoonFlow", async () => {
    proveedorAuth.verificarCredenciales.mockResolvedValue({ authUserId: "auth-huerfano", tokenAcceso: "jwt-x" });
    repo.buscarPorAuthUserId.mockResolvedValue(null);

    await expect(uc.ejecutar({ email: "huerfano@dist.com", password: "Admin2026!" })).rejects.toThrow(
      UsuarioSinPerfilError,
    );
    expect(registrarEventoAuditoria).not.toHaveBeenCalled();
  });

  it("lanza UsuarioInactivoError y audita LOGIN_FALLIDO si el usuario está desactivado", async () => {
    proveedorAuth.verificarCredenciales.mockResolvedValue({ authUserId: "auth-1", tokenAcceso: "jwt-123" });
    repo.buscarPorAuthUserId.mockResolvedValue(usuarioConRol({ activo: false }));

    await expect(uc.ejecutar({ email: "carlos@dist.com", password: "Admin2026!" })).rejects.toThrow(
      UsuarioInactivoError,
    );
    expect(registrarEventoAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ accion: "LOGIN_FALLIDO", usuarioId: "u1", empresaId: "e1" }),
    );
  });

  it("no falla si registrarEventoAuditoria no se inyecta (compatibilidad hacia atrás)", async () => {
    const ucSinAuditoria = new IniciarSesionUseCase(proveedorAuth, repo);
    proveedorAuth.verificarCredenciales.mockResolvedValue({ authUserId: "auth-1", tokenAcceso: "jwt-123" });
    repo.buscarPorAuthUserId.mockResolvedValue(usuarioConRol());

    const resultado = await ucSinAuditoria.ejecutar({ email: "carlos@dist.com", password: "Admin2026!" });

    expect(resultado.tokenAcceso).toBe("jwt-123");
  });
});
