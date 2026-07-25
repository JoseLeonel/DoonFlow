export class HallazgoFrecuenteNoEncontradoError extends Error {
  constructor(id: string) { super(`Hallazgo frecuente ${id} no encontrado.`); }
}
