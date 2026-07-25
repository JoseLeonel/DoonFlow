import type { ApiKey, ApiKeyCreada } from "@doonflow/shared";

export type { ApiKey, ApiKeyCreada };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/integraciones/api-keys${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

export function listarApiKeys(): Promise<ApiKey[]> {
  return apiFetch<ApiKey[]>("");
}

export function crearApiKey(nombre: string): Promise<ApiKeyCreada> {
  return apiFetch<ApiKeyCreada>("", { method: "POST", body: JSON.stringify({ nombre }) });
}

export function revocarApiKey(id: string): Promise<ApiKey> {
  return apiFetch<ApiKey>(`/${id}/revocar`, { method: "POST" });
}
