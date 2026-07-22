export class RolNoEditableError extends Error {
  constructor() { super("El rol administrador no puede editarse desde la matriz."); }
}
export class RolNoEncontradoError extends Error {
  constructor(id: string) { super(`Rol ${id} no encontrado.`); }
}
export class PermisoInvalidoError extends Error {
  constructor() { super("Uno o más permisos no existen en el catálogo."); }
}
