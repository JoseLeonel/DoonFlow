const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

/** Obtiene el token JWT de la cookie a través de un endpoint de la app. */
async function conToken(init?: RequestInit): Promise<RequestInit> {
  // El token está en cookie httpOnly — se adjunta automáticamente en fetch del mismo origen.
  // Para llamadas server-side desde el Route Handler, usar el header de la petición entrante.
  return init ?? {};
}

// ── Plantillas ───────────────────────────────────────────────────────────────

export interface Plantilla {
  id: string; nombre: string; descripcion?: string; tipo: string;
  activa: boolean; puntajeMaximo: number; fechaVigencia?: string;
  observaciones?: string; version: number; creadoEn: string;
}

export interface PlantillaCompleta extends Plantilla {
  apartados: Apartado[];
  rangosResultado: RangoResultado[];
}

export interface Apartado {
  id: string; codigo: string; nombre: string; orden: number;
  puntajeMaximo: number; activo: boolean; subapartados: Subapartado[];
}

export interface Subapartado {
  id: string; codigo: string; nombre: string; orden: number;
  activo: boolean; preguntas: Pregunta[];
}

export interface Pregunta {
  id: string; codigo: string; descripcion: string; orden: number;
  tipoRespuesta: string; modalidadPuntaje: string; puntajeMaximo: number;
  reglaComentario: string; evidenciaObligatoria: boolean;
  evidenciaMinima: number; evidenciaMaxima: number; activo: boolean;
  opciones: OpcionRespuesta[];
}

export interface OpcionRespuesta {
  id: string; etiqueta: string; valor: string; puntaje: number; orden: number;
}

export interface RangoResultado {
  id: string; desde: number; hasta: number; clasificacion: string;
  color: string; orden: number;
}

export interface ListaPlantillas {
  items: Plantilla[]; total: number; pagina: number; porPagina: number;
}

export async function listarPlantillas(token: string, activa?: boolean): Promise<ListaPlantillas> {
  const params = activa !== undefined ? `?activa=${activa}` : "";
  const res = await fetch(`${API}/inspeccion/plantillas${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return { ...json.meta, items: json.data };
}

export async function obtenerPlantillaCompleta(token: string, id: string): Promise<PlantillaCompleta> {
  const res = await fetch(`${API}/inspeccion/plantillas/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error");
  return json.data;
}

export async function crearPlantilla(token: string, datos: {
  nombre: string; descripcion?: string; tipo: string;
  puntajeMaximo?: number; observaciones?: string;
}): Promise<Plantilla> {
  const res = await fetch(`${API}/inspeccion/plantillas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error");
  return json.data;
}

export async function toggleEstadoPlantilla(token: string, id: string, activar: boolean) {
  const accion = activar ? "activar" : "desactivar";
  const res = await fetch(`${API}/inspeccion/plantillas/${id}/${accion}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error");
  return json.data;
}

export async function clonarPlantilla(token: string, id: string, nombre: string) {
  const res = await fetch(`${API}/inspeccion/plantillas/${id}/clonar`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nombre }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error");
  return json.data;
}

export async function agregarApartado(token: string, plantillaId: string, datos: {
  codigo: string; nombre: string; orden: number; puntajeMaximo: number;
}): Promise<Apartado> {
  const res = await fetch(`${API}/inspeccion/plantillas/${plantillaId}/apartados`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error");
  return json.data;
}
