import type { ImportacionLote, ResultadoPrevisualizacion, TipoImportacion } from "@doonflow/shared";

export type { ImportacionLote, ResultadoPrevisualizacion, TipoImportacion };

const RUTA_POR_TIPO: Record<TipoImportacion, string> = {
  CLIENTE: "clientes",
  SUCURSAL: "sucursales",
};

export async function descargarPlantilla(tipo: TipoImportacion): Promise<void> {
  const res = await fetch(`/api/integraciones/importaciones/plantilla?tipo=${tipo}`);
  if (!res.ok) throw new Error("No se pudo descargar la plantilla.");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = tipo === "CLIENTE" ? "plantilla-clientes.xlsx" : "plantilla-sucursales.xlsx";
  enlace.click();
  window.URL.revokeObjectURL(url);
}

async function subirArchivo<T>(ruta: string, archivo: File): Promise<T> {
  const formData = new FormData();
  formData.append("archivo", archivo);
  const res = await fetch(ruta, { method: "POST", body: formData });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as T;
}

export async function previsualizarImportacion(tipo: TipoImportacion, archivo: File): Promise<ResultadoPrevisualizacion> {
  return subirArchivo(`/api/integraciones/importaciones/${RUTA_POR_TIPO[tipo]}/previsualizar`, archivo);
}

export async function confirmarImportacion(tipo: TipoImportacion, archivo: File): Promise<ImportacionLote> {
  return subirArchivo(`/api/integraciones/importaciones/${RUTA_POR_TIPO[tipo]}`, archivo);
}

export async function listarHistorialImportaciones(tipo?: TipoImportacion): Promise<ImportacionLote[]> {
  const qs = tipo ? `?tipo=${tipo}` : "";
  const res = await fetch(`/api/integraciones/importaciones${qs}`, { headers: { "Content-Type": "application/json" } });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.mensaje ?? "Error en la API");
  return json.data as ImportacionLote[];
}

export async function descargarErroresLote(loteId: string): Promise<void> {
  const res = await fetch(`/api/integraciones/importaciones/${loteId}/errores`);
  if (!res.ok) throw new Error("No se pudo descargar el detalle de errores.");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `errores-${loteId}.json`;
  enlace.click();
  window.URL.revokeObjectURL(url);
}
