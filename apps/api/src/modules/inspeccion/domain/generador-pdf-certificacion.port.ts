export interface DatosPdfCertificacion {
  certificacionId: string;
  plantillaNombre: string;
  periodoEtiqueta: string | null;
  puntajeObtenido: number;
  puntajeMaximo: number;
  porcentajeCumplimiento: number;
  clasificacion: string | null;
  resultadoFinal: string;
  codigoVerificacion: string;
  firmadoEn: Date;
  fechaVencimiento: Date;
  /** 013-hallazgos-plan-cumplimiento — listado de hallazgos, si la certificación tiene alguno. */
  hallazgos?: { descripcion: string; severidad: string }[];
}

/** Puerto hacia la generación del PDF de certificado (pdfkit en infrastructure/). */
export interface GeneradorPdfCertificacionPort {
  generar(datos: DatosPdfCertificacion): Promise<Buffer>;
}
