import type { DatosReporte } from "./generador-excel.port";

export interface GeneradorPdfPort {
  /** Genera el archivo .pdf a partir de los datos agregados. */
  generar(datosReporte: DatosReporte): Promise<Buffer>;
}
