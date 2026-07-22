export class EntidadPrivacidadNoEncontradaError extends Error {
  constructor(entidadTipo: string, entidadId: string) {
    super(`No existe ${entidadTipo.toLowerCase()} ${entidadId} en esta empresa.`);
  }
}
