export class AccionAuditoriaInvalidaError extends Error {
  constructor() {
    super("La acción y el tipo de entidad son obligatorios para registrar un evento de auditoría.");
    this.name = "AccionAuditoriaInvalidaError";
  }
}
