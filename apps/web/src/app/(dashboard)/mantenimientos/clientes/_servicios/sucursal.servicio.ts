import type { RegistroCertificacion, Sucursal } from "@doonflow/shared";

export type { Sucursal, RegistroCertificacion };

export interface DatosGuardarSucursal {
  clienteId: string;
  nombre: string;
  direccion?: string | null;
  correo?: string | null;
  movil?: string | null;
}

export interface HistoricoSucursal {
  registros: RegistroCertificacion[];
  puntajeVigente: { puntaje: number; clasificacion: string | null } | null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res  = await fetch(`/api/sucursales${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

/**
 * Las sucursales de un cliente son una lista naturalmente acotada (no crece sin límite como
 * Clientes/Certificaciones) — se consume el endpoint paginado (010-seguridad-privacidad-continuidad)
 * con un límite alto en vez de exponer UI de paginación aquí. Ver impl.md del sprint 010 para la nota de alcance.
 */
export async function listarSucursales(clienteId: string): Promise<Sucursal[]> {
  return apiFetch<Sucursal[]>(`?clienteId=${clienteId}&pagina=1&porPagina=200`);
}

export async function crearSucursal(datos: DatosGuardarSucursal): Promise<Sucursal> {
  return apiFetch<Sucursal>("", { method: "POST", body: JSON.stringify(datos) });
}

export async function actualizarSucursal(id: string, datos: Partial<Omit<DatosGuardarSucursal, "clienteId">>): Promise<Sucursal> {
  return apiFetch<Sucursal>(`/${id}`, { method: "PATCH", body: JSON.stringify(datos) });
}

export async function toggleEstadoSucursal(id: string, activar: boolean): Promise<Sucursal> {
  const accion = activar ? "activar" : "desactivar";
  return apiFetch<Sucursal>(`/${id}/${accion}`, { method: "POST" });
}

export async function obtenerHistoricoSucursal(id: string): Promise<HistoricoSucursal> {
  return apiFetch<HistoricoSucursal>(`/${id}/historico`);
}

export async function obtenerSucursal(id: string): Promise<Sucursal> {
  return apiFetch<Sucursal>(`/${id}`);
}
