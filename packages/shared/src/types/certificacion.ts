import type { NodoArbol, RangoResultado } from "./inspeccion";

/**
 * Certificación (ampliación de `Inspeccion`) — incluye los campos de firma de
 * [[005-certificacion-plan-cumplimiento]] (retomado 2026-07-21).
 */
export type EstadoCertificacion = "EN_PROGRESO" | "FIRMADA";

export interface Certificacion {
  id: string;
  empresaId: string;
  plantillaId: string;
  plantillaVersion: number;
  inspectorId: string;
  sucursalId: string | null;
  periodoEtiqueta: string | null;
  estado: EstadoCertificacion;
  fechaInicio: string;
  fechaFin: string | null;
  puntajeObtenido: number;
  puntajeMaximo: number;
  porcentajeCumplimiento: number;
  clasificacion: string | null;
  observaciones: string | null;
  /** 012-captura-offline-campo — `true` desde la primera vez que se sincroniza un lote marcado como offline. */
  capturaOffline: boolean;
  /** 012-captura-offline-campo — última vez que un lote de sincronización se procesó sin dejar pendientes. */
  sincronizadoEn: string | null;
  /** 005-certificacion-plan-cumplimiento — quién/cuándo firmó. `null` mientras está en borrador. */
  firmadoPorId: string | null;
  firmadoEn: string | null;
  /** 005-certificacion-plan-cumplimiento — único en todo el sistema, no solo por empresa. */
  codigoVerificacion: string | null;
  pdfUrl: string | null;
  fechaVencimiento: string | null;
  /** 005-certificacion-plan-cumplimiento — fijo en `APROBADA` hasta que 013 calcule el valor real por severidad. */
  resultadoFinal: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface DetalleCertificacion {
  id: string;
  nodoId: string;
  valor: string | null;
  valores: string[];
  comentario: string | null;
  puntajeObtenido: number;
  puntajeMaximo: number;
}

export interface EvidenciaCertificacion {
  id: string;
  detalleId: string | null;
  tipo: string;
  url: string;
  nombre: string;
}

export interface CertificacionCompleta extends Certificacion {
  plantilla: {
    id: string;
    nombre: string;
    puntajeMaximo: number;
    nodos: NodoArbol[];
    rangosResultado: RangoResultado[];
  };
  detalles: DetalleCertificacion[];
  evidencias: EvidenciaCertificacion[];
}

export interface ResumenSeccionCertificacion {
  seccionId: string;
  titulo: string;
  respondidas: number;
  total: number;
}

export interface ResumenCertificacion {
  puntajeObtenido: number;
  puntajeMaximo: number;
  porcentajeCumplimiento: number;
  clasificacion?: string;
  porSeccion: ResumenSeccionCertificacion[];
}

// ── Hallazgos y plan de cumplimiento (013-hallazgos-plan-cumplimiento) ─────

export type Severidad = "CRITICA" | "MAYOR" | "MENOR";
export type EstadoPlan = "EN_SEGUIMIENTO" | "CERRADO" | "REABIERTO";
export type EstadoAccion = "PENDIENTE" | "EN_PROCESO" | "EN_REVISION" | "CUMPLIDO" | "NO_CUMPLIDO" | "VENCIDO";
export type ResultadoFinal = "APROBADA" | "APROBADA_CON_OBSERVACIONES" | "RECHAZADA";

export interface HallazgoEvidencia {
  id: string;
  tipo: string;
  url: string;
  nombre: string;
  tamanoBytes?: number;
  creadoEn: string;
}

export interface Hallazgo {
  id: string;
  inspeccionId: string;
  detalleId?: string | null;
  descripcion: string;
  severidad: Severidad;
  creadoEn: string;
  evidencias: HallazgoEvidencia[];
}

export interface AccionCorrectivaEvidencia {
  id: string;
  tipo: string;
  url: string;
  nombre: string;
  comentario?: string | null;
  creadoEn: string;
}

export interface AccionCorrectiva {
  id: string;
  planCumplimientoId: string;
  hallazgoId: string;
  descripcion: string;
  responsableId: string;
  responsableNombre: string;
  fechaLimite: string;
  estado: EstadoAccion;
  porcentajeAvance: number;
  verificadoPorId?: string | null;
  verificadoEn?: string | null;
  comentarioVerificacion?: string | null;
  evidencias: AccionCorrectivaEvidencia[];
}

export interface IndicadoresPlan {
  total: number;
  pendientes: number;
  enProceso: number;
  enRevision: number;
  cumplidas: number;
  noCumplidas: number;
  vencidas: number;
  porcentajeCumplimiento: number;
  proximasAVencer: number;
}

export interface PlanCumplimiento {
  id: string;
  inspeccionId: string;
  estado: EstadoPlan;
  cerradoPorId?: string | null;
  cerradoEn?: string | null;
  acciones: AccionCorrectiva[];
  indicadores: IndicadoresPlan;
}

export type OrigenEvidencia = "RESPUESTA" | "HALLAZGO" | "ACCION_CORRECTIVA";

export interface EvidenciaConsolidada {
  id: string;
  origen: OrigenEvidencia;
  tipo: string;
  url: string;
  nombre: string;
  creadoEn: string;
}
