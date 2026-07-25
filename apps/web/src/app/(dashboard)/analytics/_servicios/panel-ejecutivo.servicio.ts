import type { PanelEjecutivo } from "@doonflow/shared";

export type { PanelEjecutivo };

export async function obtenerPanelEjecutivo(clienteId?: string): Promise<PanelEjecutivo> {
  const qs = clienteId ? `?clienteId=${clienteId}` : "";
  const res = await fetch(`/api/reportes/panel-ejecutivo${qs}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "No se pudo cargar el panel ejecutivo.");
  return json.data as PanelEjecutivo;
}

export interface ClienteParaFiltro {
  id: string;
  empresa: string;
}

/** Solo lectura, para el selector de cliente — la administración vive en `/mantenimientos/clientes`. */
export async function listarClientesParaFiltro(): Promise<ClienteParaFiltro[]> {
  const res = await fetch("/api/clientes?porPagina=100");
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "No se pudo cargar la lista de clientes.");
  return (json.data as { id: string; empresa: string }[]).map((c) => ({ id: c.id, empresa: c.empresa }));
}
