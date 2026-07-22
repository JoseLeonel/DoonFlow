import type {
  DatosComparativoSucursales,
  DatosConsolidadoCliente,
  FiltrosReporte,
  FormatoReporte,
  ReporteGenerado,
  ReporteHistorialItem,
  TipoReporte,
} from "@doonflow/shared";

export type { ReporteGenerado, ReporteHistorialItem, TipoReporte, FormatoReporte, FiltrosReporte, DatosConsolidadoCliente, DatosComparativoSucursales };

export interface ListaPaginada<T> {
  items: T[];
  total: number;
}

export interface DatosGenerarReporte {
  tipo: TipoReporte;
  formato: FormatoReporte;
  clienteId: string;
  sucursalIds?: string[];
  fechaDesde: string;
  fechaHasta: string;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api/reportes${path}`, { headers: { "Content-Type": "application/json" } });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

export async function generarReporte(datos: DatosGenerarReporte): Promise<{ reporte: ReporteGenerado; urlDescarga: string }> {
  const res = await fetch("/api/reportes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data;
}

export async function listarHistorial(filtros: {
  tipo?: TipoReporte;
  clienteId?: string;
  pagina?: number;
  porPagina?: number;
}): Promise<ListaPaginada<ReporteHistorialItem>> {
  const qs = new URLSearchParams();
  if (filtros.tipo) qs.set("tipo", filtros.tipo);
  if (filtros.clienteId) qs.set("clienteId", filtros.clienteId);
  qs.set("pagina", String(filtros.pagina ?? 1));
  qs.set("porPagina", String(filtros.porPagina ?? 20));

  const res = await fetch(`/api/reportes?${qs.toString()}`, { headers: { "Content-Type": "application/json" } });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return { items: json.data as ReporteHistorialItem[], total: json.meta?.total ?? 0 };
}

export async function obtenerUrlDescarga(id: string): Promise<string> {
  const { url } = await apiFetch<{ url: string }>(`/${id}/descargar`);
  return url;
}

export async function obtenerPreviewConsolidado(clienteId: string, fechaDesde: string, fechaHasta: string): Promise<DatosConsolidadoCliente> {
  const qs = new URLSearchParams({ clienteId, fechaDesde, fechaHasta });
  return apiFetch<DatosConsolidadoCliente>(`/consolidado-cliente/preview?${qs.toString()}`);
}

export async function obtenerPreviewComparativo(
  clienteId: string,
  sucursalIds: string[],
  fechaDesde: string,
  fechaHasta: string,
): Promise<DatosComparativoSucursales> {
  const qs = new URLSearchParams({ clienteId, sucursalIds: sucursalIds.join(","), fechaDesde, fechaHasta });
  return apiFetch<DatosComparativoSucursales>(`/comparativo-sucursales/preview?${qs.toString()}`);
}
