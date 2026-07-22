import type {
  Certificacion,
  CertificacionCompleta,
  DetalleCertificacion,
  EvidenciaCertificacion,
  ResumenCertificacion,
} from "@doonflow/shared";

export type {
  Certificacion,
  CertificacionCompleta,
  DetalleCertificacion,
  EvidenciaCertificacion,
  ResumenCertificacion,
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/inspeccion${path}`, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

export interface DatosIniciarCertificacion {
  plantillaId: string;
  sucursalId: string;
  periodoEtiqueta: string;
}

export async function iniciarCertificacion(datos: DatosIniciarCertificacion): Promise<Certificacion> {
  return apiFetch<Certificacion>("/certificaciones", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export interface ListaPaginada<T> {
  items: T[];
  total: number;
}

/** Paginación server-side real (010-seguridad-privacidad-continuidad, HU-3) — default 1/20. */
export async function listarCertificaciones(
  params?: { sucursalId?: string; estado?: string; pagina?: number; porPagina?: number },
): Promise<ListaPaginada<Certificacion>> {
  const qs = new URLSearchParams();
  if (params?.sucursalId) qs.set("sucursalId", params.sucursalId);
  if (params?.estado) qs.set("estado", params.estado);
  qs.set("pagina", String(params?.pagina ?? 1));
  qs.set("porPagina", String(params?.porPagina ?? 20));

  const res = await fetch(`/api/inspeccion/certificaciones?${qs.toString()}`, { headers: { "Content-Type": "application/json" } });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return { items: json.data as Certificacion[], total: json.meta?.total ?? 0 };
}

export async function obtenerCertificacion(id: string): Promise<CertificacionCompleta> {
  return apiFetch<CertificacionCompleta>(`/certificaciones/${id}`);
}

export interface DatosRespuesta {
  nodoId: string;
  valor?: string | null;
  valores?: string[];
  comentario?: string | null;
}

export async function guardarRespuestasSeccion(
  certificacionId: string,
  respuestas: DatosRespuesta[],
): Promise<DetalleCertificacion[]> {
  return apiFetch<DetalleCertificacion[]>(`/certificaciones/${certificacionId}/respuestas`, {
    method: "PATCH",
    body: JSON.stringify({ respuestas }),
  });
}

export async function subirEvidenciaRespuesta(
  certificacionId: string,
  detalleId: string,
  archivo: File,
): Promise<EvidenciaCertificacion> {
  const form = new FormData();
  form.append("detalleId", detalleId);
  form.append("archivo", archivo);
  return apiFetch<EvidenciaCertificacion>(`/certificaciones/${certificacionId}/evidencias`, {
    method: "POST",
    body: form,
  });
}

export async function obtenerResumenCertificacion(certificacionId: string): Promise<ResumenCertificacion> {
  return apiFetch<ResumenCertificacion>(`/certificaciones/${certificacionId}/resumen`);
}

// ── Captura offline (012-captura-offline-campo) ────────────────────────────

export interface DatosRespuestaSincronizar extends DatosRespuesta {
  capturadoEnCliente: string;
}

export interface ResultadoSincronizacion {
  procesadas: number;
  conflictos: number;
  pendientes: number;
  sincronizadoEn: string;
}

export async function sincronizarLote(
  certificacionId: string,
  capturaOffline: boolean,
  respuestas: DatosRespuestaSincronizar[],
): Promise<ResultadoSincronizacion> {
  return apiFetch<ResultadoSincronizacion>(`/certificaciones/${certificacionId}/sincronizacion`, {
    method: "POST",
    body: JSON.stringify({ capturaOffline, respuestas }),
  });
}

export async function subirEvidenciaPendiente(
  certificacionId: string,
  nodoId: string,
  nombreArchivo: string,
  archivo: Blob,
): Promise<EvidenciaCertificacion> {
  const form = new FormData();
  form.append("nodoId", nodoId);
  form.append("archivo", archivo, nombreArchivo);
  return apiFetch<EvidenciaCertificacion>(`/certificaciones/${certificacionId}/sincronizacion/evidencias`, {
    method: "POST",
    body: form,
  });
}

export interface EstadoSincronizacion {
  sincronizadoEn: string | null;
  capturaOffline: boolean;
}

export async function obtenerEstadoSincronizacion(certificacionId: string): Promise<EstadoSincronizacion> {
  return apiFetch<EstadoSincronizacion>(`/certificaciones/${certificacionId}/sincronizacion/estado`);
}
