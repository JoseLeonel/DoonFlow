import type { Notificacion } from "@doonflow/shared";

export type { Notificacion };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/notificaciones${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

export function listarNotificaciones(soloNoLeidas?: boolean): Promise<Notificacion[]> {
  const qs = soloNoLeidas ? "?soloNoLeidas=true" : "";
  return apiFetch<Notificacion[]>(qs);
}

export function contarNoLeidas(): Promise<{ total: number }> {
  return apiFetch<{ total: number }>("/no-leidas/contador");
}

export function marcarLeida(id: string): Promise<Notificacion> {
  return apiFetch<Notificacion>(`/${id}/leer`, { method: "PATCH" });
}

export function marcarTodasLeidas(): Promise<{ total: number }> {
  return apiFetch<{ total: number }>("/leer-todas", { method: "PATCH" });
}
