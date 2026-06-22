/** Envelope de respuesta estándar de la API (ver CLAUDE.md → "Formato de respuesta de la API"). */

export interface MetaPaginacion {
  pagina: number;
  porPagina: number;
  total: number;
}

export function respuestaExitosa<T>(data: T, meta?: MetaPaginacion) {
  return meta ? { data, meta } : { data };
}

export function respuestaError(
  codigo: string,
  mensaje: string,
  detalles?: unknown,
) {
  return { error: { codigo, mensaje, detalles } };
}
