export type TipoImportacion = "CLIENTE" | "SUCURSAL";

export interface FilaImportacionResultado<T = Record<string, unknown>> {
  fila: number;
  datos: T;
  error?: string;
}

export interface ResultadoPrevisualizacion<T = Record<string, unknown>> {
  totalFilas: number;
  filasValidas: T[];
  filasConError: FilaImportacionResultado<T>[];
}

export interface ImportacionLote {
  id: string;
  tipo: TipoImportacion;
  archivoNombre: string;
  totalFilas: number;
  filasExitosas: number;
  filasConError: number;
  detalleErrores?: FilaImportacionResultado[] | null;
  creadoPorId: string;
  creadoEn: string;
}

/** API key de integración programática (009, HU-3) — `claveHash` nunca se expone al frontend. */
export interface ApiKey {
  id: string;
  empresaId: string;
  nombre: string;
  activa: boolean;
  ultimoUsoEn: string | null;
  creadoPorId: string;
  creadoEn: string;
}

/** Respuesta de `POST /integraciones/api-keys` — la única vez que `clave` viaja en texto plano. */
export interface ApiKeyCreada extends ApiKey {
  clave: string;
}
