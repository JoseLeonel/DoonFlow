import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReporteStoragePort } from "../domain/reporte-storage.port";

const BUCKET = "reportes";

/** Adaptador: implementa el puerto de almacenamiento contra Supabase Storage (producción). */
export class ReporteStorageSupabaseAdapter implements ReporteStoragePort {
  constructor(private readonly supabase: SupabaseClient) {}

  async subir(buffer: Buffer, ruta: string, contentType: string): Promise<string> {
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(ruta, buffer, { contentType, upsert: true });
    if (error) throw new Error(`No se pudo subir el reporte: ${error.message}`);

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(ruta);
    return data.publicUrl;
  }
}
