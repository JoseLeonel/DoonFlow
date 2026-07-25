import type { HallazgoFrecuente, SeveridadSugerida } from "@doonflow/shared";

export type { HallazgoFrecuente, SeveridadSugerida };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/hallazgos-frecuentes${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

export function listarHallazgosFrecuentes(soloActivos?: boolean): Promise<HallazgoFrecuente[]> {
  const qs = soloActivos ? "?soloActivos=true" : "";
  return apiFetch<HallazgoFrecuente[]>(qs);
}

export interface DatosHallazgoFrecuente {
  descripcionHallazgo: string;
  severidadSugerida: SeveridadSugerida;
  descripcionAccionSugerida?: string | null;
}

export function crearHallazgoFrecuente(datos: DatosHallazgoFrecuente): Promise<HallazgoFrecuente> {
  return apiFetch<HallazgoFrecuente>("", { method: "POST", body: JSON.stringify(datos) });
}

export function actualizarHallazgoFrecuente(id: string, datos: Partial<DatosHallazgoFrecuente>): Promise<HallazgoFrecuente> {
  return apiFetch<HallazgoFrecuente>(`/${id}`, { method: "PATCH", body: JSON.stringify(datos) });
}

export function activarHallazgoFrecuente(id: string): Promise<HallazgoFrecuente> {
  return apiFetch<HallazgoFrecuente>(`/${id}/activar`, { method: "POST" });
}

export function desactivarHallazgoFrecuente(id: string): Promise<HallazgoFrecuente> {
  return apiFetch<HallazgoFrecuente>(`/${id}/desactivar`, { method: "POST" });
}
