import type { Permiso, Rol } from "./rol-permiso.entity";

export interface MatrizCruda {
  roles: Rol[];
  permisos: Permiso[];
  asignaciones: { rolId: string; permisoId: string }[];
}

export interface RolPermisoRepositoryPort {
  /** Catálogo completo: todos los roles, todos los permisos y qué permiso tiene cada rol. */
  obtenerMatriz(): Promise<MatrizCruda>;
  obtenerRolPorId(rolId: string): Promise<Rol | null>;
  listarPermisosPorIds(permisoIds: string[]): Promise<Permiso[]>;
  /** Reemplaza el set completo de `RolPermiso` de un rol (borra e inserta en una transacción). */
  asignarPermisos(rolId: string, permisoIds: string[]): Promise<void>;
  /** Códigos de permiso asignados al rol con ese nombre — usado por `requierePermiso()` (no requiere `rolId`, ya que `req.usuario` solo trae el nombre del rol). */
  listarCodigosPermisoDelRol(rolNombre: string): Promise<string[]>;
}
