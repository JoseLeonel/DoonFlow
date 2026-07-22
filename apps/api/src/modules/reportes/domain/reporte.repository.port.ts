import type {
  DatosComparativoSucursales,
  DatosConsolidadoCliente,
  FiltrosReporte,
  FormatoReporte,
  ReporteGenerado,
  ReporteHistorialItem,
  TipoReporte,
} from "./reporte.entity";

export interface DatosCrearReporte {
  empresaId: string;
  tipo: TipoReporte;
  filtros: FiltrosReporte;
  formato: FormatoReporte;
  url: string;
  generadoPorId: string;
}

export interface FiltrosHistorial {
  tipo?: TipoReporte;
  clienteId?: string;
}

export interface ReporteRepositoryPort {
  /**
   * Historial paginado de la empresa, más reciente primero, con `resumenFiltros` ya resuelto
   * (nombre del cliente, no solo su id). El filtrado por alcance ocurre en el caso de uso, no aquí.
   */
  listarHistorial(
    empresaId: string,
    filtros: FiltrosHistorial,
    paginacion: { pagina: number; porPagina: number },
  ): Promise<{ items: ReporteHistorialItem[]; total: number }>;

  crear(datos: DatosCrearReporte): Promise<ReporteGenerado>;

  obtenerPorId(id: string, empresaId: string): Promise<ReporteGenerado | null>;

  /** Datos agregados del consolidado por cliente — ver domain/reporte.entity.ts para el alcance reducido. */
  obtenerDatosConsolidadoCliente(
    empresaId: string,
    clienteId: string,
    fechaDesde: string,
    fechaHasta: string,
  ): Promise<DatosConsolidadoCliente>;

  /** Datos agregados del comparativo entre sucursales — todas deben pertenecer a `clienteId`. */
  obtenerDatosComparativoSucursales(
    empresaId: string,
    clienteId: string,
    sucursalIds: string[],
    fechaDesde: string,
    fechaHasta: string,
  ): Promise<DatosComparativoSucursales>;
}
