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
