import type { Hallazgo, Severidad } from "@doonflow/shared";

export type { Hallazgo, Severidad };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/inspeccion${path}`, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

export function listarHallazgos(certificacionId: string): Promise<Hallazgo[]> {
  return apiFetch<Hallazgo[]>(`/certificaciones/${certificacionId}/hallazgos`);
}

export interface DatosCrearHallazgo {
  descripcion: string;
  severidad: Severidad;
  detalleId?: string | null;
}

export function crearHallazgo(certificacionId: string, datos: DatosCrearHallazgo): Promise<Hallazgo> {
  return apiFetch<Hallazgo>(`/certificaciones/${certificacionId}/hallazgos`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function generarHallazgosAutomaticos(certificacionId: string): Promise<Hallazgo[]> {
  return apiFetch<Hallazgo[]>(`/certificaciones/${certificacionId}/hallazgos/generar-automaticos`, { method: "POST" });
}

export function actualizarHallazgo(hallazgoId: string, datos: Partial<DatosCrearHallazgo>): Promise<Hallazgo> {
  return apiFetch<Hallazgo>(`/hallazgos/${hallazgoId}`, { method: "PATCH", body: JSON.stringify(datos) });
}

export function subirEvidenciaHallazgo(hallazgoId: string, archivo: File): Promise<Hallazgo["evidencias"][number]> {
  const form = new FormData();
  form.append("archivo", archivo);
  return apiFetch(`/hallazgos/${hallazgoId}/evidencias`, { method: "POST", body: form });
}
