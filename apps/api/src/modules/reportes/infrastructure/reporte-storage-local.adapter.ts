import { promises as fs } from "node:fs";
import path from "node:path";
import type { ReporteStoragePort } from "../domain/reporte-storage.port";

/**
 * Adaptador de almacenamiento local — guarda reportes en disco (`apps/api/uploads/`), servidos
 * por el mismo `express.static("/archivos")` que ya usan las evidencias de certificación (015).
 * Mismo patrón dual que `LocalEvidenciasAdapter`/`SupabaseEvidenciasAdapter`.
 */
export class ReporteStorageLocalAdapter implements ReporteStoragePort {
  constructor(
    private readonly baseDir = path.join(process.cwd(), "uploads"),
    private readonly baseUrl = `http://localhost:${process.env["PORT"] ?? 4000}/archivos`,
  ) {}

  async subir(buffer: Buffer, ruta: string, _contentType: string): Promise<string> {
    const destino = path.join(this.baseDir, ruta);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, buffer);
    return `${this.baseUrl}/${ruta}`;
  }
}
