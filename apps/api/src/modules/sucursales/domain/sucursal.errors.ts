export class SucursalNoEncontradaError extends Error {
  constructor(id: string) { super(`Sucursal ${id} no encontrada.`); }
}

export class ClienteNoEncontradoError extends Error {
  constructor(id: string) { super(`Cliente ${id} no encontrado.`); }
}

export class CorreoInvalidoError extends Error {
  constructor() { super("El formato del correo electrónico no es válido."); }
}
