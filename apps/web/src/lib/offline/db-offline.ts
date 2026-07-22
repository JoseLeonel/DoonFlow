/**
 * Apertura y esquema de la base IndexedDB `doonflow-offline-db` (012-captura-offline-campo).
 * Sin librería externa (idb, etc.) — la API nativa envuelta en promesas es suficiente para
 * los 4 object stores de este sprint. Ver diseño completo en el `impl.md` del sprint.
 */

export const NOMBRE_DB_OFFLINE = "doonflow-offline-db";
const VERSION_DB_OFFLINE = 1;

export const STORE_RESPUESTAS = "respuestasPendientes";
export const STORE_EVIDENCIAS = "evidenciasPendientes";
export const STORE_CERTIFICACIONES = "certificacionesOffline";
export const STORE_COLA = "colaSincronizacion";

let dbPromise: Promise<IDBDatabase> | null = null;

/** Abre (o reutiliza) la conexión a IndexedDB, creando los stores/índices en la primera versión. */
export function abrirDbOffline(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(NOMBRE_DB_OFFLINE, VERSION_DB_OFFLINE);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_RESPUESTAS)) {
        const store = db.createObjectStore(STORE_RESPUESTAS, { keyPath: "idLocal" });
        store.createIndex("inspeccionId", "inspeccionId");
        store.createIndex("estadoSync", "estadoSync");
        store.createIndex("porInspeccionYNodo", ["inspeccionId", "nodoId"], { unique: true });
      }

      if (!db.objectStoreNames.contains(STORE_EVIDENCIAS)) {
        const store = db.createObjectStore(STORE_EVIDENCIAS, { keyPath: "idLocal" });
        store.createIndex("inspeccionId", "inspeccionId");
        store.createIndex("estadoSync", "estadoSync");
      }

      if (!db.objectStoreNames.contains(STORE_CERTIFICACIONES)) {
        db.createObjectStore(STORE_CERTIFICACIONES, { keyPath: "inspeccionId" });
      }

      if (!db.objectStoreNames.contains(STORE_COLA)) {
        const store = db.createObjectStore(STORE_COLA, { keyPath: "id", autoIncrement: true });
        store.createIndex("tipo", "tipo");
        store.createIndex("inspeccionId", "inspeccionId");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

/** Convierte un `IDBRequest` en una promesa — evita repetir `onsuccess`/`onerror` en cada store. */
export function promisificarRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Abre una transacción de un solo store y retorna el `IDBObjectStore` listo para usar. */
export async function abrirStore(nombre: string, modo: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await abrirDbOffline();
  return db.transaction(nombre, modo).objectStore(nombre);
}

/** Solo para tests: descarta la conexión cacheada (fake-indexeddb resetea la BD entre archivos de test). */
export function _reiniciarConexionParaTests(): void {
  dbPromise = null;
}
