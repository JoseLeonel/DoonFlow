export class TipoDatoRetencionInvalidoError extends Error {
  constructor(tipoDato: string) {
    super(`"${tipoDato}" no es un tipo de dato de retención válido.`);
  }
}
