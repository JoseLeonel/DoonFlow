export class ApelacionNoEncontradaError extends Error {
  constructor(id: string) { super(`Apelación ${id} no encontrada.`); }
}
export class PlazoApelacionVencidoError extends Error {
  constructor() { super("El plazo para apelar esta certificación ya venció."); }
}
export class CertificacionNoFirmadaError extends Error {
  constructor() { super("Solo se puede apelar o aceptar una certificación ya firmada."); }
}
export class CertificacionVencidaError extends Error {
  constructor() { super("No se puede apelar una certificación vencida."); }
}
export class ApelacionSeparacionFuncionesError extends Error {
  constructor() { super("Quien firmó la certificación no puede resolver una apelación sobre ella."); }
}
export class ComentarioResolucionRequeridoError extends Error {
  constructor() { super("Debes indicar una justificación para resolver la apelación."); }
}
export class ApelacionYaResueltaError extends Error {
  constructor() { super("Esta apelación ya fue resuelta."); }
}
export class HallazgoDeApelacionNoEncontradoError extends Error {
  constructor(id: string) { super(`Hallazgo ${id} no encontrado para esta apelación.`); }
}
export class InspeccionNoEncontradaError extends Error {
  constructor(id: string) { super(`Certificación ${id} no encontrada.`); }
}
