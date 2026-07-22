import PDFDocument from "pdfkit";
import type { DatosPdfCertificacion, GeneradorPdfCertificacionPort } from "../domain/generador-pdf-certificacion.port";

/**
 * Genera el PDF de certificado con pdfkit — reutiliza la misma librería que
 * `ReportePdfAdapter` (008-reportes-analytics) en vez de introducir Puppeteer/Chromium
 * como planteaba `impl.md` original de 005: pdfkit ya es dependencia del monorepo y evita
 * el costo de arrancar un navegador headless para un documento de una sola página.
 */
export class PdfCertificacionAdapter implements GeneradorPdfCertificacionPort {
  async generar(datos: DatosPdfCertificacion): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(20).text("Certificado de cumplimiento", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Ficha: ${datos.plantillaNombre}`);
      if (datos.periodoEtiqueta) doc.text(`Período: ${datos.periodoEtiqueta}`);
      doc.moveDown();

      doc.fontSize(14).text(`Puntaje: ${datos.puntajeObtenido} / ${datos.puntajeMaximo}`);
      doc.text(`Cumplimiento: ${datos.porcentajeCumplimiento}%`);
      if (datos.clasificacion) doc.text(`Clasificación: ${datos.clasificacion}`);
      doc.text(`Resultado: ${datos.resultadoFinal}`);
      doc.moveDown();

      doc.fontSize(11).text(`Firmado el: ${datos.firmadoEn.toISOString()}`);
      doc.text(`Vigente hasta: ${datos.fechaVencimiento.toISOString().slice(0, 10)}`);
      doc.moveDown();

      doc.fontSize(12).font("Helvetica-Bold").text(`Código de verificación: ${datos.codigoVerificacion}`);

      if (datos.hallazgos && datos.hallazgos.length > 0) {
        doc.moveDown();
        doc.fontSize(13).font("Helvetica-Bold").text("Hallazgos");
        doc.font("Helvetica");
        for (const h of datos.hallazgos) {
          doc.fontSize(11).text(`• [${h.severidad}] ${h.descripcion}`);
        }
      }

      doc.end();
    });
  }
}
