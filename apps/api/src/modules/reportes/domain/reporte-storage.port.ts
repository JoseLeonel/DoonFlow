export interface ReporteStoragePort {
  /** Sube el archivo generado y retorna la URL (pública o firmada) donde queda accesible. */
  subir(buffer: Buffer, ruta: string, contentType: string): Promise<string>;
}
