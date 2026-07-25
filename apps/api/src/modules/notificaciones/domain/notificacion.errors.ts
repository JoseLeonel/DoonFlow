export class NotificacionNoEncontradaError extends Error {
  constructor(id: string) { super(`Notificación ${id} no encontrada.`); }
}
