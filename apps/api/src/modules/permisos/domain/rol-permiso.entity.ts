/**
 * Entidad de dominio — Módulo de Permisos (007-gobernanza-permisos-aprobacion).
 * Sin dependencias de Express ni Prisma.
 */
import { ROL_ADMIN } from "@doonflow/shared";

export interface Rol {
  id: string;
  nombre: string;
  descripcion?: string | null;
}

export interface Permiso {
  id: string;
  codigo: string;
  descripcion?: string | null;
}

/**
 * El rol `administrador` tiene todos los permisos implícitos por regla de negocio,
 * sin necesitar filas `RolPermiso` explícitas — evita bloquear accidentalmente al superusuario.
 *
 * @param rol - Rol a evaluar (solo se usa `nombre`).
 * @returns `true` si `rol.nombre === "administrador"`.
 * @example
 *   esRolAdministrador({ nombre: "administrador" })  // → true
 */
export function esRolAdministrador(rol: Pick<Rol, "nombre">): boolean {
  return rol.nombre === ROL_ADMIN;
}

/**
 * Un rol es editable desde la matriz de permisos si no es `administrador`.
 *
 * @param rol - Rol a evaluar.
 * @returns Negación exacta de `esRolAdministrador(rol)`.
 * @example
 *   puedeEditarseDesdeMatriz({ nombre: "auditor" })  // → true
 */
export function puedeEditarseDesdeMatriz(rol: Pick<Rol, "nombre">): boolean {
  return !esRolAdministrador(rol);
}
