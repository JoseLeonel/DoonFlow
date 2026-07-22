import { STORE_EVIDENCIAS, abrirStore, promisificarRequest } from "./db-offline";

export type EstadoSync = "PENDIENTE" | "SINCRONIZANDO" | "SINCRONIZADO" | "ERROR";

export interface EvidenciaOffline {
  idLocal: string;
  inspeccionId: string;
  nodoIdRelacionado: string;
  blob: Blob;
  nombreArchivo: string;
  tamanoBytes: number;
  estadoSync: EstadoSync;
}

const ANCHO_MAXIMO_PX = 1600;
const CALIDAD_JPEG = 0.7;

/**
 * Redimensiona a un ancho máximo (1600px) y recodifica a JPEG calidad ~0.7 vía `<canvas>`
 * nativo, antes de guardar el `Blob` en IndexedDB — reduce tiempo de sincronización en datos
 * móviles rurales. Se comprime siempre al capturar (no solo con "conexión lenta" detectada,
 * decisión de este sprint documentada en `impl.md`). Archivos que no son imagen comprimible
 * (PDF/DOC/DOCX/HEIC, o un entorno sin soporte de Canvas 2D) se guardan sin modificar.
 */
export async function comprimirImagen(archivo: File): Promise<Blob> {
  if (!archivo.type.startsWith("image/") || archivo.type === "image/heic") return archivo;
  if (typeof createImageBitmap === "undefined" || typeof document === "undefined") return archivo;

  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, ANCHO_MAXIMO_PX / bitmap.width);
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return archivo;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", CALIDAD_JPEG));
    return blob ?? archivo;
  } catch {
    return archivo;
  }
}

/** Comprime (si aplica) y guarda una evidencia local asociada a `nodoIdRelacionado` — no requiere `detalleId` (puede no existir todavía). */
export async function guardarEvidenciaLocal(inspeccionId: string, nodoIdRelacionado: string, archivo: File): Promise<EvidenciaOffline> {
  const blob = await comprimirImagen(archivo);
  const extension = blob.type === "image/jpeg" ? "jpg" : (archivo.name.split(".").pop() ?? "bin");

  const fila: EvidenciaOffline = {
    idLocal: crypto.randomUUID(),
    inspeccionId,
    nodoIdRelacionado,
    blob,
    // Generado una sola vez al capturar — se reutiliza en cada reintento de subida (idempotencia por sobrescritura de ruta).
    nombreArchivo: `${crypto.randomUUID()}.${extension}`,
    tamanoBytes: blob.size,
    estadoSync: "PENDIENTE",
  };
  const store = await abrirStore(STORE_EVIDENCIAS, "readwrite");
  await promisificarRequest(store.put(fila));
  return fila;
}

export async function listarEvidenciasPendientes(inspeccionId: string): Promise<EvidenciaOffline[]> {
  const store = await abrirStore(STORE_EVIDENCIAS, "readonly");
  const indice = store.index("inspeccionId");
  const todas = (await promisificarRequest(indice.getAll(inspeccionId))) as EvidenciaOffline[];
  return todas.filter((e) => e.estadoSync !== "SINCRONIZADO");
}

export async function marcarEvidenciaSincronizada(idLocal: string): Promise<void> {
  await actualizarEstado(idLocal, "SINCRONIZADO");
}

export async function marcarEvidenciaConError(idLocal: string): Promise<void> {
  await actualizarEstado(idLocal, "ERROR");
}

async function actualizarEstado(idLocal: string, estadoSync: EstadoSync): Promise<void> {
  const store = await abrirStore(STORE_EVIDENCIAS, "readwrite");
  const fila = (await promisificarRequest(store.get(idLocal))) as EvidenciaOffline | undefined;
  if (!fila) return;
  await promisificarRequest(store.put({ ...fila, estadoSync }));
}

export async function contarEvidenciasPendientes(inspeccionId: string): Promise<number> {
  return (await listarEvidenciasPendientes(inspeccionId)).length;
}
