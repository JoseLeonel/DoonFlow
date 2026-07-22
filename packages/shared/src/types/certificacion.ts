import type { NodoArbol, RangoResultado } from "./inspeccion";

/**
 * Certificación (ampliación de `Inspeccion`) — solo los campos de 015-wizard-certificacion.
 * Sin campos de firma (`firmadoPorId`, `codigoVerificacion`, `pdfUrl`, etc.) — esos
 * pertenecen a [[005-certificacion-plan-cumplimiento]], pausado. Cuando se retome, este
 * archivo se AMPLÍA (no se reemplaza) con esos campos.
 */
export type EstadoCertificacion = "EN_PROGRESO";

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
