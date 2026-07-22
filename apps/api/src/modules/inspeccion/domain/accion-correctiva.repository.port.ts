import type { AccionCorrectiva } from "./accion-correctiva.entity";
import type { AlcanceConsulta } from "./certificacion.repository.port";

export interface AccionCorrectivaEvidenciaGuardada {
  id: string;
  accionCorrectivaId: string;
  tipo: string;
  url: string;
  nombre: string;
  comentario: string | null;
  creadoEn: Date;
}

export interface AccionCorrectivaConEvidencias extends AccionCorrectiva {
  evidencias: AccionCorrectivaEvidenciaGuardada[];
}

/** Acción correctiva con los datos de la certificación de origen necesarios para resolver alcance. */
export interface AccionCorrectivaConOrigen extends AccionCorrectivaConEvidencias {
  inspeccionId: string;
  sucursalId: string | null;
  clienteId: string | null;
}

export interface DatosCrearAccion {
  planCumplimientoId: string;
  hallazgoId: string;
  descripcion: string;
  responsableId: string;
  fechaLimite: Date;
}

export interface DatosActualizarAccion {
  descripcion?: string;
  responsableId?: string;
  fechaLimite?: Date;
}

export interface DatosVerificarAccion {
  resultado: "CUMPLIDO" | "NO_CUMPLIDO";
  comentario: string;
  verificadoPorId: string;
  nuevaFechaLimite?: Date;
}

export interface AccionCorrectivaRepositoryPort {
  /** Crea una acción correctiva ligada a un hallazgo del mismo plan. */
  crear(datos: DatosCrearAccion): Promise<AccionCorrectivaConEvidencias>;

  /** Obtiene una acción por id, con la sucursal/cliente/inspección de origen (para resolver alcance). */
  obtenerPorId(id: string, empresaId: string): Promise<AccionCorrectivaConOrigen | null>;

  /** Edita descripción, responsable o fecha límite de una acción. */
  actualizar(id: string, empresaId: string, datos: DatosActualizarAccion): Promise<AccionCorrectivaConEvidencias>;

  /** Actualiza el porcentaje de avance del responsable. */
  actualizarAvance(id: string, empresaId: string, porcentajeAvance: number): Promise<AccionCorrectivaConEvidencias>;

  /** Cambia el estado a `EN_REVISION`. */
  enviarARevision(id: string, empresaId: string): Promise<AccionCorrectivaConEvidencias>;

  /** Aplica el resultado de la verificación del auditor. */
  verificar(id: string, empresaId: string, datos: DatosVerificarAccion): Promise<AccionCorrectivaConEvidencias>;

  /** Lista todas las acciones de un plan de cumplimiento. */
  listarPorPlan(planCumplimientoId: string, empresaId: string): Promise<AccionCorrectivaConEvidencias[]>;

  /** Lista las acciones donde el usuario autenticado es responsable (o dentro de su alcance de administrador). */
  listarPorResponsable(usuarioId: string, empresaId: string, alcance?: AlcanceConsulta): Promise<AccionCorrectivaConEvidencias[]>;

  /** Lista las acciones `EN_REVISION` visibles según el alcance del auditor/administrador. */
  listarEnRevision(empresaId: string, alcance?: AlcanceConsulta): Promise<AccionCorrectivaConEvidencias[]>;

  /** Adjunta una evidencia de avance ya subida. */
  agregarEvidencia(
    accionCorrectivaId: string,
    datos: { tipo: string; url: string; nombre: string; comentario?: string },
  ): Promise<AccionCorrectivaEvidenciaGuardada>;
}
