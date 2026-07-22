import type { Hallazgo } from "./hallazgo.entity";

export interface HallazgoEvidenciaGuardada {
  id: string;
  hallazgoId: string;
  tipo: string;
  url: string;
  nombre: string;
  tamanoBytes: number | null;
  creadoEn: Date;
}

export interface HallazgoConEvidencias extends Hallazgo {
  evidencias: HallazgoEvidenciaGuardada[];
}

export interface DatosCrearHallazgo {
  inspeccionId: string;
  empresaId: string;
  descripcion: string;
  severidad: string;
  detalleId?: string | null;
}

export interface DatosActualizarHallazgo {
  descripcion?: string;
  severidad?: string;
}

export interface HallazgoRepositoryPort {
  /** Lista los hallazgos de una certificación (más antiguos primero). */
  listarPorInspeccion(inspeccionId: string, empresaId: string): Promise<HallazgoConEvidencias[]>;

  /** Lista solo los `detalleId` que ya tienen un hallazgo generado (soporta la idempotencia de `generarAutomaticos`). */
  listarDetalleIdsConHallazgo(inspeccionId: string): Promise<Set<string>>;

  /** Crea un hallazgo (manual o automático). */
  crear(datos: DatosCrearHallazgo): Promise<HallazgoConEvidencias>;

  /** Crea varios hallazgos automáticos en una sola operación. */
  crearVarios(datos: DatosCrearHallazgo[]): Promise<HallazgoConEvidencias[]>;

  /** Obtiene un hallazgo por id, acotado a la empresa. */
  obtenerPorId(id: string, empresaId: string): Promise<HallazgoConEvidencias | null>;

  /** Edita un hallazgo (ej. severidad sugerida antes de generar el plan). */
  actualizar(id: string, empresaId: string, datos: DatosActualizarHallazgo): Promise<HallazgoConEvidencias>;

  /** Adjunta una evidencia ya subida a un hallazgo. */
  agregarEvidencia(
    hallazgoId: string,
    datos: { tipo: string; url: string; nombre: string; tamanoBytes?: number },
  ): Promise<HallazgoEvidenciaGuardada>;
}
