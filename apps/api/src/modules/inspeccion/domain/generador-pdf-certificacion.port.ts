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
  /**
   * 013-hallazgos-plan-cumplimiento — listado de hallazgos, si la certificación tiene alguno.
   * 2026-07-25: incluye `categoria` (NO_CONFORMIDAD/RECONOCIMIENTO/OBSERVACION/OPORTUNIDAD_MEJORA)
   * para que el adaptador los agrupe en las 3 secciones pedidas por el cliente además de las
   * no conformidades — `severidad` es `null` para las 3 categorías informativas.
   */
  hallazgos?: { descripcion: string; categoria: string; severidad: string | null }[];
  /** 006-vigencia-notificaciones-portal — URL del portal público (`/verificar/{codigoVerificacion}`) para el QR embebido. */
  urlVerificacion: string;
}

/** Puerto hacia la generación del PDF de certificado (pdfkit en infrastructure/). */
export interface GeneradorPdfCertificacionPort {
  generar(datos: DatosPdfCertificacion): Promise<Buffer>;
}
