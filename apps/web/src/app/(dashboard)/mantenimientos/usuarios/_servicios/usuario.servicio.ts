import type { RolSistema, UsuarioConAlcance } from "@doonflow/shared";

export type { UsuarioConAlcance };

export interface RolCatalogo {
  id: string;
  nombre: RolSistema;
}

export interface DatosGuardarUsuario {
  nombre: string;
  email: string;
  password?: string;
  rolId: string;
  clienteId?: string | null;
  sucursalId?: string | null;
  sucursalesAdicionalesIds?: string[];
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res  = await fetch(`/api/usuarios${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

export async function listarUsuarios(): Promise<UsuarioConAlcance[]> {
  return apiFetch<UsuarioConAlcance[]>("");
}

export async function listarRoles(): Promise<RolCatalogo[]> {
  return apiFetch<RolCatalogo[]>("/roles");
}

export async function obtenerUsuario(id: string): Promise<UsuarioConAlcance> {
  return apiFetch<UsuarioConAlcance>(`/${id}`);
}

export async function crearUsuario(datos: DatosGuardarUsuario): Promise<UsuarioConAlcance> {
  return apiFetch<UsuarioConAlcance>("", { method: "POST", body: JSON.stringify(datos) });
}

export async function actualizarUsuario(id: string, datos: Partial<DatosGuardarUsuario>): Promise<UsuarioConAlcance> {
  return apiFetch<UsuarioConAlcance>(`/${id}`, { method: "PATCH", body: JSON.stringify(datos) });
}

export async function toggleEstadoUsuario(id: string, activar: boolean): Promise<UsuarioConAlcance> {
  const accion = activar ? "activar" : "desactivar";
  return apiFetch<UsuarioConAlcance>(`/${id}/${accion}`, { method: "POST" });
}
