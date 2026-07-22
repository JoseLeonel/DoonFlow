import type { AccionCorrectiva, EvidenciaConsolidada, PlanCumplimiento } from "@doonflow/shared";

export type { AccionCorrectiva, EvidenciaConsolidada, PlanCumplimiento };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/inspeccion${path}`, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

export function generarPlan(certificacionId: string): Promise<PlanCumplimiento> {
  return apiFetch<PlanCumplimiento>(`/certificaciones/${certificacionId}/plan-cumplimiento`, { method: "POST" });
}

/** `null` si la certificación todavía no tiene plan de cumplimiento generado (404 esperado, no un error). */
export async function obtenerPlan(certificacionId: string): Promise<PlanCumplimiento | null> {
  const res = await fetch(`/api/inspeccion/certificaciones/${certificacionId}/plan-cumplimiento`);
  if (res.status === 404) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as PlanCumplimiento;
}

export function cerrarPlan(planId: string): Promise<PlanCumplimiento> {
  return apiFetch<PlanCumplimiento>(`/plan-cumplimiento/${planId}/cerrar`, { method: "POST" });
}

export function reabrirPlan(planId: string): Promise<PlanCumplimiento> {
  return apiFetch<PlanCumplimiento>(`/plan-cumplimiento/${planId}/reabrir`, { method: "POST" });
}

export interface DatosCrearAccion {
  hallazgoId: string;
  descripcion: string;
  responsableId: string;
  fechaLimite: string;
}

export function crearAccion(planId: string, datos: DatosCrearAccion): Promise<AccionCorrectiva> {
  return apiFetch<AccionCorrectiva>(`/plan-cumplimiento/${planId}/acciones`, { method: "POST", body: JSON.stringify(datos) });
}

export function actualizarAccion(accionId: string, datos: Partial<Omit<DatosCrearAccion, "hallazgoId">>): Promise<AccionCorrectiva> {
  return apiFetch<AccionCorrectiva>(`/acciones/${accionId}`, { method: "PATCH", body: JSON.stringify(datos) });
}

export function actualizarAvanceAccion(accionId: string, porcentajeAvance: number): Promise<AccionCorrectiva> {
  return apiFetch<AccionCorrectiva>(`/acciones/${accionId}/avance`, { method: "PATCH", body: JSON.stringify({ porcentajeAvance }) });
}

export function enviarAccionARevision(accionId: string): Promise<AccionCorrectiva> {
  return apiFetch<AccionCorrectiva>(`/acciones/${accionId}/enviar-revision`, { method: "POST" });
}

export function subirEvidenciaAccion(accionId: string, archivo: File, comentario?: string): Promise<AccionCorrectiva["evidencias"][number]> {
  const form = new FormData();
  form.append("archivo", archivo);
  if (comentario) form.append("comentario", comentario);
  return apiFetch(`/acciones/${accionId}/evidencias`, { method: "POST", body: form });
}

export function verificarAccion(
  accionId: string,
  resultado: "CUMPLIDO" | "NO_CUMPLIDO",
  comentario: string,
  nuevaFechaLimite?: string,
): Promise<AccionCorrectiva> {
  return apiFetch<AccionCorrectiva>(`/acciones/${accionId}/verificar`, {
    method: "POST",
    body: JSON.stringify({ resultado, comentario, nuevaFechaLimite }),
  });
}

export function listarMisAcciones(): Promise<AccionCorrectiva[]> {
  return apiFetch<AccionCorrectiva[]>("/mis-acciones");
}

export function listarAccionesEnRevision(): Promise<AccionCorrectiva[]> {
  return apiFetch<AccionCorrectiva[]>("/acciones-en-revision");
}

export function obtenerEvidenciasConsolidadas(certificacionId: string): Promise<EvidenciaConsolidada[]> {
  return apiFetch<EvidenciaConsolidada[]>(`/certificaciones/${certificacionId}/evidencias`);
}
