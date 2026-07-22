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
