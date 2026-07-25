import type { Apelacion, TipoApelacion } from "@doonflow/shared";

export type { Apelacion, TipoApelacion };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/apelaciones${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

export function listarApelacionesAbiertas(): Promise<Apelacion[]> {
  return apiFetch<Apelacion[]>("");
}

export function obtenerApelacion(id: string): Promise<Apelacion> {
  return apiFetch<Apelacion>(`/${id}`);
}

export interface DatosPresentarApelacion {
  inspeccionId: string;
  tipo: TipoApelacion;
  hallazgoId?: string;
  motivo: string;
}

export function presentarApelacion(datos: DatosPresentarApelacion): Promise<Apelacion> {
  return apiFetch<Apelacion>("", { method: "POST", body: JSON.stringify(datos) });
}

export interface DatosResolverApelacion {
  estado: "ACEPTADA" | "RECHAZADA";
  resolucionComentario: string;
}

export function resolverApelacion(id: string, datos: DatosResolverApelacion): Promise<Apelacion> {
  return apiFetch<Apelacion>(`/${id}/resolver`, { method: "POST", body: JSON.stringify(datos) });
}

export function listarApelacionesDeInspeccion(inspeccionId: string): Promise<Apelacion[]> {
  return apiFetch<Apelacion[]>(`/por-inspeccion/${inspeccionId}`);
}
