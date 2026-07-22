import type { MatrizPermisos } from "@doonflow/shared";

export type { MatrizPermisos };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/permisos${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

export async function obtenerMatriz(): Promise<MatrizPermisos> {
  return apiFetch<MatrizPermisos>("/matriz");
}

export async function guardarPermisosDeRol(rolId: string, permisoIds: string[]): Promise<void> {
  await apiFetch(`/roles/${rolId}`, { method: "PUT", body: JSON.stringify({ permisoIds }) });
}
