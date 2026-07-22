export class ClienteNoEncontradoError extends Error {
  constructor(id: string) { super(`Cliente ${id} no encontrado.`); }
}

export class IdentificacionDuplicadaError extends Error {
  constructor() { super("Ya existe un cliente con esa identificación en esta empresa."); }
}

export class EmailInvalidoError extends Error {
  constructor(campo: string) { super(`El formato del correo electrónico en "${campo}" no es válido.`); }
}
