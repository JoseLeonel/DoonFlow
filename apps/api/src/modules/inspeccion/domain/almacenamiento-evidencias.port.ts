/** Puerto hacia el almacenamiento de archivos de evidencia (Supabase Storage en infrastructure/). */
export interface AlmacenamientoEvidenciasPort {
  /** Sube el archivo a la ruta indicada y retorna la URL (firmada o pública) para acceder a él. */
  subirArchivo(ruta: string, buffer: Buffer, mime: string): Promise<string>;
}
