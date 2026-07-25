import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { DatosPdfCertificacion, GeneradorPdfCertificacionPort } from "../domain/generador-pdf-certificacion.port";

/**
 * Genera el PDF de certificado con pdfkit — reutiliza la misma librería que
 * `ReportePdfAdapter` (008-reportes-analytics) en vez de introducir Puppeteer/Chromium
 * como planteaba `impl.md` original de 005: pdfkit ya es dependencia del monorepo y evita
 * el costo de arrancar un navegador headless para un documento de una sola página.
 *
 * 006-vigencia-notificaciones-portal: agrega un QR que apunta al portal público de
 * verificación (`urlVerificacion`), embebido como imagen PNG (`qrcode`, sin dependencias nativas).
 */
export class PdfCertificacionAdapter implements GeneradorPdfCertificacionPort {
  async generar(datos: DatosPdfCertificacion): Promise<Buffer> {
    const qrBuffer = await QRCode.toBuffer(datos.urlVerificacion, { margin: 1, width: 120 });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.image(qrBuffer, doc.page.width - 50 - 100, 50, { width: 100 });

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
        const noConformidades = datos.hallazgos.filter((h) => h.categoria === "NO_CONFORMIDAD");
        const reconocimientos = datos.hallazgos.filter((h) => h.categoria === "RECONOCIMIENTO");
        const observaciones = datos.hallazgos.filter((h) => h.categoria === "OBSERVACION");
        const oportunidadesMejora = datos.hallazgos.filter((h) => h.categoria === "OPORTUNIDAD_MEJORA");

        const seccion = (titulo: string, items: typeof datos.hallazgos) => {
          if (items.length === 0) return;
          doc.moveDown();
          doc.fontSize(13).font("Helvetica-Bold").text(titulo);
          doc.font("Helvetica");
          for (const h of items) {
            doc.fontSize(11).text(h.severidad ? `• [${h.severidad}] ${h.descripcion}` : `• ${h.descripcion}`);
          }
        };

        seccion("No conformidades", noConformidades);
        seccion("Reconocimientos", reconocimientos);
        seccion("Observaciones", observaciones);
        seccion("Oportunidades de mejora", oportunidadesMejora);
      }

      doc.end();
    });
  }
}
