/**
 * Datos públicos de una certificación firmada — solo lo que el portal de verificación (sin
 * autenticación) puede mostrar. Nunca incluye `hallazgos`, `respuestas` ni `evidencias`
 * (regla 2 de la spec). `estado` no viene del repositorio — lo calcula el caso de uso
 * comparando `fechaVencimiento` con la fecha actual (regla de negocio 3: es un cálculo de
 * presentación, el `estado` interno de `Inspeccion` sigue siendo `FIRMADA`).
 */
export interface CertificadoPublicoCrudo {
  cliente: string;
  sucursal: string;
  fechaEmision: Date;
  fechaVencimiento: Date;
  nombrePlantilla: string;
}

export interface VerificacionRepositoryPort {
  /** Puerto de solo lectura — no reutiliza el repositorio completo de `Inspeccion` para no
   *  arrastrar métodos de escritura a un flujo sin autenticación. */
  obtenerPorCodigo(codigoVerificacion: string): Promise<CertificadoPublicoCrudo | null>;
}
