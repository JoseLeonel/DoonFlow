import type { PlanAuditoria } from "@doonflow/shared";

export type { PlanAuditoria };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/planificacion${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

export function listarPlanesAuditoria(): Promise<PlanAuditoria[]> {
  return apiFetch<PlanAuditoria[]>("");
}

export interface DatosProgramarPlan {
  sucursalId: string;
  fechaObjetivo: string;
  responsableSugeridoId?: string;
}

export function programarPlanAuditoria(datos: DatosProgramarPlan): Promise<PlanAuditoria> {
  return apiFetch<PlanAuditoria>("", { method: "POST", body: JSON.stringify(datos) });
}

export function reprogramarPlanAuditoria(id: string, fechaObjetivo: string): Promise<PlanAuditoria> {
  return apiFetch<PlanAuditoria>(`/${id}/reprogramar`, { method: "PATCH", body: JSON.stringify({ fechaObjetivo }) });
}

export function iniciarAhoraPlanAuditoria(id: string): Promise<{ redirigirA: string }> {
  return apiFetch<{ redirigirA: string }>(`/${id}/iniciar-ahora`, { method: "POST" });
}

export interface SucursalParaFiltro {
  id: string;
  nombre: string;
}

/** Solo lectura, para el selector de sucursal del formulario de programación. */
export async function listarSucursalesParaFiltro(): Promise<SucursalParaFiltro[]> {
  const res = await fetch("/api/sucursales?porPagina=100");
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "No se pudo cargar la lista de sucursales.");
  return (json.data as { id: string; nombre: string }[]).map((s) => ({ id: s.id, nombre: s.nombre }));
}
