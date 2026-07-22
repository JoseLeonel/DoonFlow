import { promises as fs } from "node:fs";
import path from "node:path";
import type { AlmacenamientoEvidenciasPort } from "../domain/almacenamiento-evidencias.port";

/**
 * Adaptador de almacenamiento local — guarda evidencias en disco (`apps/api/uploads/`).
 * Se usa cuando no hay Supabase configurado (desarrollo local con PostgreSQL directo),
 * mismo patrón dual que `LocalAuthAdapter` vs `SupabaseAuthAdapter`.
 */
export class LocalEvidenciasAdapter implements AlmacenamientoEvidenciasPort {
  constructor(
    private readonly baseDir = path.join(process.cwd(), "uploads"),
    private readonly baseUrl = `http://localhost:${process.env["PORT"] ?? 4000}/archivos`,
  ) {}

  async subirArchivo(ruta: string, buffer: Buffer, _mime: string): Promise<string> {
    const destino = path.join(this.baseDir, ruta);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, buffer);
    return `${this.baseUrl}/${ruta}`;
  }
}
