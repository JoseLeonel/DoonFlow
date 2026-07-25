import type { HallazgoFrecuente } from "@doonflow/shared";

export type { HallazgoFrecuente };

/** Solo lectura — la biblioteca se administra desde `/mantenimientos/hallazgos-frecuentes`. */
export async function listarHallazgosFrecuentesActivos(): Promise<HallazgoFrecuente[]> {
  const res = await fetch("/api/hallazgos-frecuentes?soloActivos=true");
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as HallazgoFrecuente[];
}
