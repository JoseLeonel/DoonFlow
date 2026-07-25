import { STORE_CERTIFICACIONES, abrirStore, promisificarRequest } from "./db-offline";
import {
  listarRespuestasPendientes,
  marcarRespuestaSincronizada,
  type RespuestaOffline,
} from "./respuestas-offline.store";
import {
  listarEvidenciasPendientes,
  marcarEvidenciaSincronizada,
  marcarEvidenciaConError,
  type EvidenciaOffline,
} from "./evidencias-offline.store";

const REINTENTOS_MAXIMOS = 5;
let backoffBaseMs = 2000;

/** Backoff exponencial: intento 1 → 2s, 2 → 4s, 3 → 8s, 4 → 16s, 5 → 32s (con la base por defecto). */
export function calcularBackoff(intento: number): number {
  return backoffBaseMs * 2 ** (intento - 1);
}

/** Solo para tests: evita esperar segundos reales en los casos que ejercitan el backoff. */
export function _establecerBackoffBaseMsParaTests(ms: number): void {
  backoffBaseMs = ms;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Único punto de este directorio autorizado a llamar `fetch` — inyectado por quien orquesta (el hook `use-captura-offline`), nunca importado directamente por los stores. */
export interface ClienteSincronizacion {
  sincronizarLote(inspeccionId: string, capturaOffline: boolean, respuestas: RespuestaOffline[]): Promise<unknown>;
  subirEvidencia(inspeccionId: string, evidencia: EvidenciaOffline): Promise<unknown>;
}

export interface MetadatoCertificacionOffline {
  inspeccionId: string;
  capturaOffline: boolean;
  ultimaModificacionLocal: string;
  ultimoIntentoSincronizacion: string | null;
  intentosFallidosConsecutivos: number;
}

export interface ResultadoSincronizacionCola {
  exitoTotal: boolean;
  respuestasProcesadas: number;
  evidenciasProcesadas: number;
  evidenciasFallidas: number;
}

/**
 * Procesa la cola de una certificación: primero todas las RESPUESTA pendientes (un solo lote),
 * luego las EVIDENCIA pendientes una por una (regla de negocio 3 del spec — mismo destino final).
 * Reintenta cada paso con backoff exponencial; si una evidencia falla tras agotar los reintentos,
 * las respuestas y evidencias que sí tuvieron éxito quedan marcadas como sincronizadas — no se
 * pierden ni se revierten (regla de negocio 4).
 */
export async function procesarColaSincronizacion(
  inspeccionId: string,
  cliente: ClienteSincronizacion,
  opciones: { capturaOffline?: boolean } = {},
): Promise<ResultadoSincronizacionCola> {
  await marcarIntentoSincronizacion(inspeccionId);

  const respuestasProcesadas = await procesarRespuestasPendientes(inspeccionId, cliente, opciones.capturaOffline ?? false);
  const { procesadas: evidenciasProcesadas, fallidas: evidenciasFallidas } = await procesarEvidenciasPendientes(inspeccionId, cliente);

  const exitoTotal = evidenciasFallidas === 0;
  await actualizarTrasIntento(inspeccionId, exitoTotal);

  return { exitoTotal, respuestasProcesadas, evidenciasProcesadas, evidenciasFallidas };
}

async function procesarRespuestasPendientes(
  inspeccionId: string,
  cliente: ClienteSincronizacion,
  capturaOffline: boolean,
): Promise<number> {
  const pendientes = await listarRespuestasPendientes(inspeccionId);
  if (pendientes.length === 0) return 0;

  const exito = await conReintentos(() => cliente.sincronizarLote(inspeccionId, capturaOffline, pendientes));
  if (!exito) return 0;

  for (const r of pendientes) await marcarRespuestaSincronizada(r.idLocal);
  return pendientes.length;
}

async function procesarEvidenciasPendientes(
  inspeccionId: string,
  cliente: ClienteSincronizacion,
): Promise<{ procesadas: number; fallidas: number }> {
  const pendientes = await listarEvidenciasPendientes(inspeccionId);
  let procesadas = 0;
  let fallidas = 0;

  for (const evidencia of pendientes) {
    const exito = await conReintentos(() => cliente.subirEvidencia(inspeccionId, evidencia));
    if (exito) {
      await marcarEvidenciaSincronizada(evidencia.idLocal);
      procesadas++;
    } else {
      await marcarEvidenciaConError(evidencia.idLocal);
      fallidas++;
    }
  }
  return { procesadas, fallidas };
}

async function conReintentos(fn: () => Promise<unknown>): Promise<boolean> {
  for (let intento = 1; intento <= REINTENTOS_MAXIMOS; intento++) {
    try {
      await fn();
      return true;
    } catch {
      if (intento === REINTENTOS_MAXIMOS) return false;
      await esperar(calcularBackoff(intento));
    }
  }
  return false;
}

// ── Metadato de sincronización por certificación (store `certificacionesOffline`) ──────────

export async function obtenerMetadatoCertificacion(inspeccionId: string): Promise<MetadatoCertificacionOffline | undefined> {
  const store = await abrirStore(STORE_CERTIFICACIONES, "readonly");
  return promisificarRequest(store.get(inspeccionId));
}

/** Marca `capturaOffline = true` y actualiza `ultimaModificacionLocal` — se llama cada vez que se guarda algo localmente. */
export async function marcarModificacionLocal(inspeccionId: string): Promise<void> {
  const store = await abrirStore(STORE_CERTIFICACIONES, "readwrite");
  const existente = await promisificarRequest<MetadatoCertificacionOffline | undefined>(store.get(inspeccionId));
  const fila: MetadatoCertificacionOffline = {
    inspeccionId,
    capturaOffline: true,
    ultimaModificacionLocal: new Date().toISOString(),
    ultimoIntentoSincronizacion: existente?.ultimoIntentoSincronizacion ?? null,
    intentosFallidosConsecutivos: existente?.intentosFallidosConsecutivos ?? 0,
  };
  await promisificarRequest(store.put(fila));
}

async function marcarIntentoSincronizacion(inspeccionId: string): Promise<void> {
  const store = await abrirStore(STORE_CERTIFICACIONES, "readwrite");
  const existente = await promisificarRequest<MetadatoCertificacionOffline | undefined>(store.get(inspeccionId));
  if (!existente) return;
  await promisificarRequest(store.put({ ...existente, ultimoIntentoSincronizacion: new Date().toISOString() }));
}

async function actualizarTrasIntento(inspeccionId: string, exito: boolean): Promise<void> {
  const store = await abrirStore(STORE_CERTIFICACIONES, "readwrite");
  const existente = await promisificarRequest<MetadatoCertificacionOffline | undefined>(store.get(inspeccionId));
  if (!existente) return;
  await promisificarRequest(store.put({
    ...existente,
    intentosFallidosConsecutivos: exito ? 0 : existente.intentosFallidosConsecutivos + 1,
  }));
}
