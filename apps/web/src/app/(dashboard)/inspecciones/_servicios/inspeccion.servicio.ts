import type {
  Plantilla,
  PlantillaCompleta,
  NodoArbol,
  RangoResultado,
  ListaPlantillas,
} from "@doonflow/shared";

export type {
  Plantilla,
  PlantillaCompleta,
  NodoArbol,
  RangoResultado,
  ListaPlantillas,
  TipoNodo,
  TipoRespuesta,
  ModalidadPuntaje,
  NodoOpcion,
} from "@doonflow/shared";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/inspeccion${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

// ── Plantillas ───────────────────────────────────────────────────────────────

export async function listarPlantillas(activa?: boolean): Promise<ListaPlantillas> {
  const params = activa !== undefined ? `?activa=${activa}` : "";
  const res = await fetch(`/api/inspeccion/plantillas${params}`);
  const json = await res.json();
  return {
    items: json.data ?? [],
    total: json.meta?.total ?? 0,
    pagina: json.meta?.pagina ?? 1,
    porPagina: json.meta?.porPagina ?? 20,
  };
}

export async function obtenerPlantillaCompleta(id: string): Promise<PlantillaCompleta> {
  return apiFetch<PlantillaCompleta>(`/plantillas/${id}`);
}

export interface DatosCrearPlantilla {
  nombre: string;
  descripcion?: string;
  tipo: string;
  puntajeMaximo?: number;
  fechaVigencia?: string;
  observaciones?: string;
}

export async function crearPlantilla(datos: DatosCrearPlantilla): Promise<Plantilla> {
  return apiFetch<Plantilla>("/plantillas", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function actualizarPlantilla(
  id: string,
  datos: Partial<DatosCrearPlantilla>,
): Promise<Plantilla> {
  return apiFetch<Plantilla>(`/plantillas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(datos),
  });
}

export async function toggleEstadoPlantilla(id: string, activar: boolean): Promise<Plantilla> {
  const accion = activar ? "activar" : "desactivar";
  return apiFetch<Plantilla>(`/plantillas/${id}/${accion}`, { method: "POST" });
}

export async function eliminarPlantilla(id: string): Promise<void> {
  await fetch(`/api/inspeccion/plantillas/${id}`, { method: "DELETE" });
}

export async function clonarPlantilla(id: string, nombre: string): Promise<Plantilla> {
  return apiFetch<Plantilla>(`/plantillas/${id}/clonar`, {
    method: "POST",
    body: JSON.stringify({ nombre }),
  });
}

// ── Aprobación (007-gobernanza-permisos-aprobacion) ─────────────────────────

export async function enviarRevisionPlantilla(id: string): Promise<Plantilla> {
  return apiFetch<Plantilla>(`/plantillas/${id}/enviar-revision`, { method: "POST" });
}

export async function aprobarPlantilla(id: string): Promise<Plantilla> {
  return apiFetch<Plantilla>(`/plantillas/${id}/aprobar`, { method: "POST" });
}

export async function rechazarPlantilla(id: string, comentario: string): Promise<Plantilla> {
  return apiFetch<Plantilla>(`/plantillas/${id}/rechazar`, {
    method: "POST",
    body: JSON.stringify({ comentario }),
  });
}

export async function listarPendientesAprobacion(pagina = 1, porPagina = 20): Promise<ListaPlantillas> {
  const res = await fetch(`/api/inspeccion/plantillas/pendientes-aprobacion?pagina=${pagina}&porPagina=${porPagina}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return {
    items: json.data ?? [],
    total: json.meta?.total ?? 0,
    pagina: json.meta?.pagina ?? pagina,
    porPagina: json.meta?.porPagina ?? porPagina,
  };
}

// ── Nodos ────────────────────────────────────────────────────────────────────

export interface DatosCrearNodo {
  padreId?: string;
  tipo: "PANEL" | "PREGUNTA";
  codigo: string;
  titulo: string;
  criterio?: string;
  orden?: number;
  tipoRespuesta?: string;
  modalidadPuntaje?: string;
  puntajeMaximo?: number;
  evidenciaObligatoria?: boolean;
  evidenciaMinima?: number;
  evidenciaMaxima?: number;
}

export async function crearNodo(plantillaId: string, datos: DatosCrearNodo): Promise<NodoArbol> {
  return apiFetch<NodoArbol>(`/plantillas/${plantillaId}/nodos`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function actualizarNodo(
  plantillaId: string,
  nodoId: string,
  datos: Partial<DatosCrearNodo>,
): Promise<NodoArbol> {
  return apiFetch<NodoArbol>(`/plantillas/${plantillaId}/nodos/${nodoId}`, {
    method: "PATCH",
    body: JSON.stringify(datos),
  });
}

export async function eliminarNodo(plantillaId: string, nodoId: string): Promise<void> {
  await fetch(`/api/inspeccion/plantillas/${plantillaId}/nodos/${nodoId}`, { method: "DELETE" });
}

export async function reordenarNodos(
  plantillaId: string,
  items: { id: string; orden: number }[],
): Promise<void> {
  await apiFetch(`/plantillas/${plantillaId}/nodos/reordenar`, {
    method: "PATCH",
    body: JSON.stringify({ items }),
  });
}

// ── Rangos de resultado ──────────────────────────────────────────────────────

export async function guardarRangos(
  plantillaId: string,
  rangos: Omit<RangoResultado, "id">[],
): Promise<RangoResultado[]> {
  return apiFetch<RangoResultado[]>(`/plantillas/${plantillaId}/rangos`, {
    method: "PATCH",
    body: JSON.stringify({ rangos }),
  });
}
