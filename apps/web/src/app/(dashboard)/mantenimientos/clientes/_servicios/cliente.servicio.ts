import type { Cliente } from "@doonflow/shared";

export type { Cliente };

export interface DatosGuardarCliente {
  nombreResponsable: string;
  empresa: string;
  identificacionEmpresa?: string | null;
  correo1: string;
  correo2?: string | null;
  correo3?: string | null;
  direccion?: string | null;
  movil?: string | null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res  = await fetch(`/api/clientes${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

export interface ListaPaginada<T> {
  items: T[];
  total: number;
}

/** Paginación server-side real (010-seguridad-privacidad-continuidad, HU-3) — default 1/20. */
export async function listarClientes(pagina = 1, porPagina = 20): Promise<ListaPaginada<Cliente>> {
  const res  = await fetch(`/api/clientes?pagina=${pagina}&porPagina=${porPagina}`, { headers: { "Content-Type": "application/json" } });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return { items: json.data as Cliente[], total: json.meta?.total ?? 0 };
}

export async function obtenerCliente(id: string): Promise<Cliente> {
  return apiFetch<Cliente>(`/${id}`);
}

export async function crearCliente(datos: DatosGuardarCliente): Promise<Cliente> {
  const res  = await fetch("/api/clientes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as Cliente;
}

export async function actualizarCliente(id: string, datos: Partial<DatosGuardarCliente>): Promise<Cliente> {
  return apiFetch<Cliente>(`/${id}`, { method: "PATCH", body: JSON.stringify(datos) });
}

export async function toggleEstadoCliente(id: string, activar: boolean): Promise<Cliente> {
  const accion = activar ? "activar" : "desactivar";
  return apiFetch<Cliente>(`/${id}/${accion}`, { method: "POST" });
}
