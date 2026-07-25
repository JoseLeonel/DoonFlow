export type TipoReporte = "CONSOLIDADO_CLIENTE" | "COMPARATIVO_SUCURSALES";
export type FormatoReporte = "EXCEL" | "PDF";

export interface FiltrosReporte {
  clienteId: string;
  sucursalIds?: string[];
  fechaDesde: string;
  fechaHasta: string;
}

export interface ReporteGenerado {
  id: string;
  empresaId: string;
  tipo: TipoReporte;
  filtros: FiltrosReporte;
  formato: FormatoReporte;
  url: string;
  generadoPorId: string;
  creadoEn: string;
}

/** Fila del historial — igual que `ReporteGenerado` más los textos ya resueltos por el backend. */
export interface ReporteHistorialItem extends ReporteGenerado {
  resumenFiltros: string;
  generadoPorNombre: string;
}

/**
 * Alcance reducido respecto al spec original de 008-reportes-analytics (ver memoria/decisiones.md,
 * 2026-07-21): sin hallazgosAbiertos/estadoPlanCumplimiento (013 bloqueado) ni
 * certificacionVigente/certificacionVencida (fechaVencimiento es de 005, pausado).
 */
export interface FilaConsolidadoSucursal {
  sucursalId: string;
  sucursalNombre: string;
  certificacionesDelPeriodo: number;
  puntajeVigente: number | null;
  puntajeMaximoVigente: number | null;
  clasificacionVigente: string | null;
}

export interface DatosConsolidadoCliente {
  clienteId: string;
  clienteNombre: string;
  periodo: { fechaDesde: string; fechaHasta: string };
  sucursales: FilaConsolidadoSucursal[];
}

export interface FilaComparativaSucursal {
  sucursalId: string;
  sucursalNombre: string;
  puntaje: number | null;
  puntajeMaximo: number | null;
  porcentajeCumplimiento: number | null;
  clasificacion: string | null;
  tieneCertificacionEnPeriodo: boolean;
}

export interface DatosComparativoSucursales {
  clienteId: string;
  clienteNombre: string;
  periodo: { fechaDesde: string; fechaHasta: string };
  filas: FilaComparativaSucursal[];
}

// ── Panel ejecutivo (014-panel-calendario-biblioteca, HU-4) ─────────────────

export type TipoItemAtencion = "certificacion_por_vencer" | "accion_vencida";

export interface ItemAtencion {
  tipo: TipoItemAtencion;
  sucursal: string;
  cliente: string;
  fecha?: string;
  diasRestantes?: number;
  descripcion?: string;
  diasVencida?: number;
}

export interface PanelEjecutivo {
  pctSucursalesVigentes: number;
  certificacionesPorVencer30d: number;
  hallazgosCriticosAbiertos: number;
  accionesVencidas: number;
  atencionRequerida: ItemAtencion[];
}
