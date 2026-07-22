export type TipoDatoRetencion = "EVIDENCIA" | "PDF_CERTIFICACION" | "DATO_PERSONAL_CONTACTO";
export type AccionAlVencer = "ANONIMIZAR" | "ELIMINAR";

export interface PoliticaRetencion {
  id: string;
  empresaId: string;
  tipoDato: TipoDatoRetencion;
  mesesRetencion: number;
  accionAlVencer: AccionAlVencer;
  actualizadoEn: string;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/retencion${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

export async function listarPoliticas(): Promise<PoliticaRetencion[]> {
  return apiFetch<PoliticaRetencion[]>("/politicas");
}

export async function actualizarPolitica(
  tipoDato: TipoDatoRetencion,
  datos: { mesesRetencion: number; accionAlVencer: AccionAlVencer },
): Promise<PoliticaRetencion> {
  return apiFetch<PoliticaRetencion>(`/politicas/${tipoDato}`, { method: "PUT", body: JSON.stringify(datos) });
}
