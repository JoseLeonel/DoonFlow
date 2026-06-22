export class PlantillaNoEncontradaError extends Error {
  constructor(id: string) { super(`Plantilla ${id} no encontrada.`); }
}
export class PlantillaInactivaError extends Error {
  constructor() { super("La plantilla está inactiva o fuera de vigencia."); }
}
export class PlantillaConInspeccionesError extends Error {
  constructor() { super("No se puede eliminar una plantilla con inspecciones registradas."); }
}
export class RangosInvalidosError extends Error {
  constructor(detalle: string) { super(`Rangos de resultado inválidos: ${detalle}`); }
}
export class InspeccionNoEncontradaError extends Error {
  constructor(id: string) { super(`Inspección ${id} no encontrada.`); }
}
