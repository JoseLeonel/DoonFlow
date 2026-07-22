import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlmacenamientoEvidenciasPort } from "../domain/almacenamiento-evidencias.port";

const BUCKET = "certificaciones";

/** Adaptador: sube el PDF de certificado a Supabase Storage (producción), bucket propio (no "evidencias"). */
export class SupabaseCertificacionPdfAdapter implements AlmacenamientoEvidenciasPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async subirArchivo(ruta: string, buffer: Buffer, mime: string): Promise<string> {
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(ruta, buffer, { contentType: mime, upsert: true });
    if (error) throw new Error(`No se pudo subir el PDF de certificado: ${error.message}`);

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(ruta);
    return data.publicUrl;
  }
}
