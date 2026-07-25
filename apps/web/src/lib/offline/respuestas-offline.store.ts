import { STORE_RESPUESTAS, abrirStore, promisificarRequest } from "./db-offline";

export type EstadoSync = "PENDIENTE" | "SINCRONIZANDO" | "SINCRONIZADO" | "ERROR";

export interface RespuestaOffline {
  idLocal: string;
  inspeccionId: string;
  nodoId: string;
  valor?: string | null;
  valores?: string[];
  comentarioReconocimiento?: string | null;
  comentarioObservacion?: string | null;
  comentarioOportunidadMejora?: string | null;
  capturadoEnCliente: string;
  estadoSync: EstadoSync;
}

export type DatosRespuestaOffline = {
  inspeccionId: string;
  nodoId: string;
  valor?: string | null;
  valores?: string[];
  comentarioReconocimiento?: string | null;
  comentarioObservacion?: string | null;
  comentarioOportunidadMejora?: string | null;
};

/** Guarda una respuesta localmente — el mismo `(inspeccionId, nodoId)` sobrescribe la fila anterior (evita acumular versiones intermedias). */
export async function guardarRespuestaLocal(datos: DatosRespuestaOffline): Promise<RespuestaOffline> {
  const store = await abrirStore(STORE_RESPUESTAS, "readwrite");
  const indice = store.index("porInspeccionYNodo");
  const existente = (await promisificarRequest(indice.get([datos.inspeccionId, datos.nodoId]))) as RespuestaOffline | undefined;

  const fila: RespuestaOffline = {
    idLocal: existente?.idLocal ?? crypto.randomUUID(),
    inspeccionId: datos.inspeccionId,
    nodoId: datos.nodoId,
    valor: datos.valor ?? null,
    valores: datos.valores ?? [],
    comentarioReconocimiento: datos.comentarioReconocimiento ?? null,
    comentarioObservacion: datos.comentarioObservacion ?? null,
    comentarioOportunidadMejora: datos.comentarioOportunidadMejora ?? null,
    capturadoEnCliente: new Date().toISOString(),
    estadoSync: "PENDIENTE",
  };
  await promisificarRequest(store.put(fila));
  return fila;
}

/** Respuestas de una certificación que aún no se confirmaron sincronizadas (incluye `ERROR`, para reintentar). */
export async function listarRespuestasPendientes(inspeccionId: string): Promise<RespuestaOffline[]> {
  const store = await abrirStore(STORE_RESPUESTAS, "readonly");
  const indice = store.index("inspeccionId");
  const todas = (await promisificarRequest(indice.getAll(inspeccionId))) as RespuestaOffline[];
  return todas.filter((r) => r.estadoSync !== "SINCRONIZADO");
}

export async function marcarRespuestaSincronizada(idLocal: string): Promise<void> {
  await actualizarEstado(idLocal, "SINCRONIZADO");
}

export async function marcarRespuestaConError(idLocal: string): Promise<void> {
  await actualizarEstado(idLocal, "ERROR");
}

async function actualizarEstado(idLocal: string, estadoSync: EstadoSync): Promise<void> {
  const store = await abrirStore(STORE_RESPUESTAS, "readwrite");
  const fila = (await promisificarRequest(store.get(idLocal))) as RespuestaOffline | undefined;
  if (!fila) return;
  await promisificarRequest(store.put({ ...fila, estadoSync }));
}

export async function contarRespuestasPendientes(inspeccionId: string): Promise<number> {
  return (await listarRespuestasPendientes(inspeccionId)).length;
}
