import type { RolSistema } from "@doonflow/shared";

/** Entidad de dominio — usuario con su rol resuelto. Sin dependencias de Express/Prisma. */
export interface UsuarioConRol {
  id: string;
  empresaId: string;
  authUserId: string;
  email: string;
  nombre: string;
  rol: RolSistema;
  activo: boolean;
}

/** Regla de negocio pura: un usuario inactivo nunca puede iniciar sesión. */
export function puedeIniciarSesion(usuario: UsuarioConRol): boolean {
  return usuario.activo;
}
