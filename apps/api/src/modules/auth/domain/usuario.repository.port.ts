import type { RolSistema } from "@doonflow/shared";
import type { UsuarioConRol } from "./usuario.entity";

/** Vista enriquecida de usuario para listado/detalle — nombres de rol/cliente/sucursal ya resueltos. */
export interface UsuarioDetalle {
  id: string;
  empresaId: string;
  email: string;
  nombre: string;
  rolId: string;
  rolNombre: RolSistema;
  clienteId: string | null;
  clienteNombre: string | null;
  sucursalId: string | null;
  sucursalNombre: string | null;
  sucursalesAdicionales: { id: string; nombre: string }[];
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface DatosCrearUsuario {
  empresaId: string;
  nombre: string;
  email: string;
  passwordHash?: string | null;
  rolId: string;
  clienteId?: string | null;
  sucursalId?: string | null;
}

export interface DatosActualizarUsuario {
  nombre?: string;
  email?: string;
  rolId?: string;
  clienteId?: string | null;
  sucursalId?: string | null;
}

/** Puerto (interfaz) — implementado en infrastructure/usuario.prisma-repository.ts. */
export interface UsuarioRepositoryPort {
  buscarPorAuthUserId(authUserId: string): Promise<UsuarioConRol | null>;

  listar(empresaId: string): Promise<UsuarioDetalle[]>;

  obtenerPorId(id: string, empresaId: string): Promise<UsuarioDetalle | null>;

  buscarPorEmail(email: string, empresaId: string): Promise<UsuarioConRol | null>;

  crear(datos: DatosCrearUsuario, sucursalesAdicionalesIds: string[]): Promise<UsuarioDetalle>;

  actualizar(id: string, empresaId: string, datos: DatosActualizarUsuario, sucursalesAdicionalesIds?: string[]): Promise<UsuarioDetalle>;

  cambiarEstado(id: string, empresaId: string, activo: boolean): Promise<UsuarioDetalle>;

  obtenerSucursalesAdicionales(usuarioId: string): Promise<string[]>;

  reemplazarSucursalesAdicionales(usuarioId: string, sucursalIds: string[]): Promise<void>;

  /** Hash actual de la contraseña (null si el usuario no tiene login local, ej. solo Supabase). */
  obtenerPasswordHash(id: string, empresaId: string): Promise<string | null>;

  actualizarPasswordHash(id: string, empresaId: string, passwordHash: string): Promise<void>;
}
