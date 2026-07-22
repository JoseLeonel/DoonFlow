import ExcelJS from "exceljs";
import type { DatosComparativoSucursales, DatosConsolidadoCliente } from "../domain/reporte.entity";
import type { DatosReporte, GeneradorExcelPort } from "../domain/generador-excel.port";

const ESTILO_ENCABEZADO = { font: { bold: true }, fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFE2E8F0" } } };

export class ReporteExcelAdapter implements GeneradorExcelPort {
  async generar(datosReporte: DatosReporte): Promise<Buffer> {
    const libro = new ExcelJS.Workbook();

    if (datosReporte.tipo === "CONSOLIDADO_CLIENTE") {
      this.hojaConsolidado(libro, datosReporte.datos);
    } else {
      this.hojaComparativo(libro, datosReporte.datos);
    }

    const buffer = await libro.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private hojaConsolidado(libro: ExcelJS.Workbook, datos: DatosConsolidadoCliente) {
    const hoja = libro.addWorksheet("Consolidado");
    hoja.columns = [
      { header: "Sucursal", key: "sucursal", width: 28 },
      { header: "Certificaciones del período", key: "certificaciones", width: 22 },
      { header: "Puntaje", key: "puntaje", width: 14 },
      { header: "Clasificación", key: "clasificacion", width: 18 },
    ];
    hoja.getRow(1).eachCell((celda) => Object.assign(celda, ESTILO_ENCABEZADO));

    for (const fila of datos.sucursales) {
      hoja.addRow({
        sucursal: fila.sucursalNombre,
        certificaciones: fila.certificacionesDelPeriodo,
        puntaje: fila.puntajeVigente !== null ? `${fila.puntajeVigente}/${fila.puntajeMaximoVigente}` : "—",
        clasificacion: fila.clasificacionVigente ?? "—",
      });
    }
  }

  private hojaComparativo(libro: ExcelJS.Workbook, datos: DatosComparativoSucursales) {
    const hoja = libro.addWorksheet("Comparativo");
    hoja.columns = [
      { header: "Sucursal", key: "sucursal", width: 28 },
      { header: "Puntaje", key: "puntaje", width: 14 },
      { header: "% Cumplimiento", key: "porcentaje", width: 16 },
      { header: "Clasificación", key: "clasificacion", width: 18 },
      { header: "Certificación en el período", key: "tiene", width: 22 },
    ];
    hoja.getRow(1).eachCell((celda) => Object.assign(celda, ESTILO_ENCABEZADO));

    for (const fila of datos.filas) {
      hoja.addRow({
        sucursal: fila.sucursalNombre,
        puntaje: fila.puntaje !== null ? `${fila.puntaje}/${fila.puntajeMaximo}` : "—",
        porcentaje: fila.porcentajeCumplimiento !== null ? `${fila.porcentajeCumplimiento}%` : "—",
        clasificacion: fila.clasificacion ?? "—",
        tiene: fila.tieneCertificacionEnPeriodo ? "Sí" : "No",
      });
    }
  }
}
