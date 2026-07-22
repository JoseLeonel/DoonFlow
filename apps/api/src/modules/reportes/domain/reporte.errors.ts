export class ClienteFueraDeAlcanceError extends Error {
  constructor() {
    super("No tienes acceso a generar reportes de este cliente.");
  }
}

export class AccesoModuloReportesDenegadoError extends Error {
  constructor() {
    super("Tu rol no tiene acceso al módulo de reportes.");
  }
}

export class TipoReporteInvalidoError extends Error {
  constructor() {
    super("El tipo de reporte no es válido.");
  }
}

export class ReporteNoEncontradoError extends Error {
  constructor() {
    super("El reporte no existe o no pertenece a tu alcance.");
  }
}
