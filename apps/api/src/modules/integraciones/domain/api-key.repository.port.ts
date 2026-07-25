import type { ApiKey } from "./api-key.entity";

export interface DatosCrearApiKey {
  empresaId: string;
  nombre: string;
  claveHash: string;
  creadoPorId: string;
}

export interface ApiKeyRepositoryPort {
  /** Lista las API keys de la empresa (activas y revocadas), más reciente primero. */
  listar(empresaId: string): Promise<ApiKey[]>;

  /** Obtiene una API key por id, o `null` si no existe o pertenece a otra empresa. */
  obtenerPorId(id: string, empresaId: string): Promise<ApiKey | null>;

  /** Crea una API key nueva, activa por defecto. */
  crear(datos: DatosCrearApiKey): Promise<ApiKey>;

  /** Revoca la API key (`activa = false`) — nunca se elimina físicamente. */
  revocar(id: string, empresaId: string): Promise<ApiKey>;

  /**
   * Busca una API key activa por el hash de su clave — usado por el middleware de autenticación
   * de la API pública, sin `empresaId` (la request todavía no tiene identidad hasta resolver esto).
   */
  obtenerActivaPorHash(claveHash: string): Promise<ApiKey | null>;

  /** Actualiza `ultimoUsoEn` a la fecha dada — se llama en cada request exitoso a la API pública. */
  marcarUso(id: string, fecha: Date): Promise<void>;
}
