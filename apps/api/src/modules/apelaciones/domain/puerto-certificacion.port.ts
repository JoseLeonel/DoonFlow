/**
 * Puerto que el módulo `apelaciones` consume del módulo `inspeccion` (dueño de `Certificacion`
 * y `Hallazgo`) — nunca importa su repositorio Prisma directamente, para no violar la
 * propiedad de esas entidades (011-aceptacion-apelaciones-certificacion, mismo patrón usado por
 * `apps/api/src/modules/reportes` con otros módulos).
 *
 * `alcance` es opaco para este módulo: se recibe del controller y se reenvía tal cual al
 * adaptador real (implementado dentro de `inspeccion`), que sí sabe interpretarlo.
 */

export interface CertificacionParaApelaciones {
  id: string;
  estado: string;
  firmadoEn: Date | null;
  firmadoPorId: string | null;
  fechaVencimiento: Date | null;
}

export interface HallazgoParaApelaciones {
  id: string;
  inspeccionId: string;
  estado: string;
}

export interface PuertoCertificacionParaApelaciones {
  /** Certificación (acotada a empresa/alcance) usada para validar plazo/estado/separación de funciones. */
  obtenerCertificacion(id: string, empresaId: string, alcance?: unknown): Promise<CertificacionParaApelaciones | null>;

  /** Hallazgo (acotado a empresa) referido por una apelación `SOBRE_HALLAZGO`. */
  obtenerHallazgo(id: string, empresaId: string): Promise<HallazgoParaApelaciones | null>;

  /** Marca el hallazgo `ANULADO_POR_APELACION` — nunca se borra. */
  anularHallazgoPorApelacion(hallazgoId: string, empresaId: string): Promise<void>;

  /** Recalcula y persiste `resultadoFinal` de la certificación excluyendo los hallazgos anulados. */
  recalcularResultadoFinal(inspeccionId: string, empresaId: string): Promise<void>;
}
