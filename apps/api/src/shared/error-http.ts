/** Error HTTP genérico que cualquier controller (infraestructura) puede lanzar. */
export class ErrorHttp extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles?: unknown,
  ) {
    super(mensaje);
  }
}
