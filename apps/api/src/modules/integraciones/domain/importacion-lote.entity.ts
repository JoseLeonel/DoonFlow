export type TipoImportacion = "CLIENTE" | "SUCURSAL";

export interface FilaImportacionResultado<T = Record<string, unknown>> {
  fila: number;
  datos: T;
  error?: string;
}

export interface ImportacionLote {
  id: string;
  empresaId: string;
  tipo: TipoImportacion;
  archivoNombre: string;
  totalFilas: number;
  filasExitosas: number;
  filasConError: number;
  detalleErrores: FilaImportacionResultado[] | null;
  creadoPorId: string;
  creadoEn: Date;
}

export interface DatosImportacionLote {
  tipo: TipoImportacion;
  archivoNombre: string;
  totalFilas: number;
  filasExitosas: number;
  filasConError: number;
  detalleErrores: FilaImportacionResultado[] | null;
}

/**
 * Arma el resumen de un lote de importación a partir de los resultados fila por fila —
 * una fila con `error` cuenta como fallida, sin detener el resto del archivo (regla de negocio 1 del spec).
 *
 * @param tipo - `CLIENTE` o `SUCURSAL`.
 * @param archivoNombre - Nombre del archivo original subido por el usuario.
 * @param resultados - Un `FilaImportacionResultado` por cada fila procesada del Excel.
 * @returns Snapshot listo para persistir como `ImportacionLote`.
 * @example
 *   construirResumenLote("CLIENTE", "clientes.xlsx", [{ fila: 2, datos: {} }, { fila: 3, datos: {}, error: "..." }])
 *   // → { tipo: "CLIENTE", archivoNombre: "clientes.xlsx", totalFilas: 2, filasExitosas: 1, filasConError: 1, detalleErrores: [...] }
 */
export function construirResumenLote(
  tipo: TipoImportacion,
  archivoNombre: string,
  resultados: FilaImportacionResultado[],
): DatosImportacionLote {
  const fallidas = resultados.filter((r) => r.error);
  return {
    tipo,
    archivoNombre,
    totalFilas: resultados.length,
    filasExitosas: resultados.length - fallidas.length,
    filasConError: fallidas.length,
    detalleErrores: fallidas.length > 0 ? fallidas : null,
  };
}
