import type { SesionActual } from "@doonflow/shared";

export async function obtenerSesionActual(): Promise<SesionActual> {
  const res  = await fetch("/api/auth/me", { headers: { "Content-Type": "application/json" } });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "No se pudo obtener la sesión actual.");
  return json.data as SesionActual;
}
