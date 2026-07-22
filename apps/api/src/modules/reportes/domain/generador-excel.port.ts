import type { DatosComparativoSucursales, DatosConsolidadoCliente } from "./reporte.entity";

export type DatosReporte =
  | { tipo: "CONSOLIDADO_CLIENTE"; datos: DatosConsolidadoCliente }
  | { tipo: "COMPARATIVO_SUCURSALES"; datos: DatosComparativoSucursales };

export interface GeneradorExcelPort {
  /** Genera el archivo .xlsx a partir de los datos agregados. */
  generar(datosReporte: DatosReporte): Promise<Buffer>;
}
