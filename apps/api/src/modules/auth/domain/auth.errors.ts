/** Errores de dominio del módulo auth — se mapean a HTTP en infrastructure/auth.controller.ts. */

export class CredencialesInvalidasError extends Error {
  constructor() {
    super("Email o contraseña incorrectos.");
  }
}

export class UsuarioInactivoError extends Error {
  constructor() {
    super("El usuario está inactivo para esta empresa.");
  }
}

export class UsuarioSinPerfilError extends Error {
  constructor() {
    super("La cuenta no tiene un perfil de usuario asociado en DoonFlow.");
  }
}

export class UsuarioNoEncontradoError extends Error {
  constructor(id: string) {
    super(`Usuario ${id} no encontrado.`);
  }
}

export class SucursalRequeridaError extends Error {
  constructor() {
    super("Un usuario de sucursal necesita una sucursal principal o al menos una sucursal adicional.");
  }
}

export class AlcanceInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class EmailDuplicadoError extends Error {
  constructor() {
    super("Ya existe un usuario con ese correo en esta empresa.");
  }
}

/** 010-seguridad-privacidad-continuidad — contraseña que no cumple `validarPoliticaPassword()`. */
export class PasswordDebilError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
  }
}

/** 010-seguridad-privacidad-continuidad — `passwordActual` no coincide al cambiar contraseña. */
export class PasswordActualIncorrectaError extends Error {
  constructor() {
    super("La contraseña actual no es correcta.");
  }
}
