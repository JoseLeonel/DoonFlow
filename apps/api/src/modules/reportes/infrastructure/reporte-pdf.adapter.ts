import PDFDocument from "pdfkit";
import type { DatosComparativoSucursales, DatosConsolidadoCliente } from "../domain/reporte.entity";
import type { DatosReporte } from "../domain/generador-excel.port";
import type { GeneradorPdfPort } from "../domain/generador-pdf.port";

const ANCHO_COLUMNAS_CONSOLIDADO = [180, 90, 90, 100];
const ANCHO_COLUMNAS_COMPARATIVO = [150, 80, 90, 90, 90];

export class ReportePdfAdapter implements GeneradorPdfPort {
  async generar(datosReporte: DatosReporte): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      if (datosReporte.tipo === "CONSOLIDADO_CLIENTE") {
        this.escribirConsolidado(doc, datosReporte.datos);
      } else {
        this.escribirComparativo(doc, datosReporte.datos);
      }

      doc.end();
    });
  }

  private escribirConsolidado(doc: PDFKit.PDFDocument, datos: DatosConsolidadoCliente) {
    doc.fontSize(16).text(`Reporte consolidado — ${datos.clienteNombre}`, { underline: true });
    doc.fontSize(10).text(`Período: ${datos.periodo.fechaDesde} – ${datos.periodo.fechaHasta}`);
    doc.moveDown();

    const encabezados = ["Sucursal", "Certif. período", "Puntaje", "Clasificación"];
    this.escribirFila(doc, encabezados, ANCHO_COLUMNAS_CONSOLIDADO, true);

    for (const fila of datos.sucursales) {
      this.escribirFila(doc, [
        fila.sucursalNombre,
        String(fila.certificacionesDelPeriodo),
        fila.puntajeVigente !== null ? `${fila.puntajeVigente}/${fila.puntajeMaximoVigente}` : "—",
        fila.clasificacionVigente ?? "—",
      ], ANCHO_COLUMNAS_CONSOLIDADO, false);
    }
  }

  private escribirComparativo(doc: PDFKit.PDFDocument, datos: DatosComparativoSucursales) {
    doc.fontSize(16).text(`Reporte comparativo entre sucursales — ${datos.clienteNombre}`, { underline: true });
    doc.fontSize(10).text(`Período: ${datos.periodo.fechaDesde} – ${datos.periodo.fechaHasta}`);
    doc.moveDown();

    const encabezados = ["Sucursal", "Puntaje", "% Cumpl.", "Clasificación", "Certif. período"];
    this.escribirFila(doc, encabezados, ANCHO_COLUMNAS_COMPARATIVO, true);

    for (const fila of datos.filas) {
      this.escribirFila(doc, [
        fila.sucursalNombre,
        fila.puntaje !== null ? `${fila.puntaje}/${fila.puntajeMaximo}` : "—",
        fila.porcentajeCumplimiento !== null ? `${fila.porcentajeCumplimiento}%` : "—",
        fila.clasificacion ?? "—",
        fila.tieneCertificacionEnPeriodo ? "Sí" : "No",
      ], ANCHO_COLUMNAS_COMPARATIVO, false);
    }
  }

  private escribirFila(doc: PDFKit.PDFDocument, celdas: string[], anchos: number[], esEncabezado: boolean) {
    const y = doc.y;
    doc.font(esEncabezado ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    let x = doc.page.margins.left;
    celdas.forEach((texto, i) => {
      doc.text(texto, x, y, { width: anchos[i] });
      x += anchos[i]!;
    });
    doc.moveDown(0.5);
  }
}
