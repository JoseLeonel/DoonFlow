import { promises as fs } from "node:fs";
import path from "node:path";
import type { AlmacenamientoEvidenciasPort } from "../domain/almacenamiento-evidencias.port";

/**
 * Adaptador de almacenamiento local para el PDF de certificado — mismo patrón y mismo mount
 * estático (`/archivos` → `uploads/`, ya registrado en `index.ts`) que `LocalEvidenciasAdapter`,
 * solo que la ruta recibida ya viene prefijada con `certificaciones-pdf/` para no mezclar
 * documentos generados por el sistema con evidencias subidas por el usuario.
 */
export class LocalCertificacionPdfAdapter implements AlmacenamientoEvidenciasPort {
  constructor(
    private readonly baseDir = path.join(process.cwd(), "uploads", "certificaciones-pdf"),
    private readonly baseUrl = `http://localhost:${process.env["PORT"] ?? 4000}/archivos/certificaciones-pdf`,
  ) {}

  async subirArchivo(ruta: string, buffer: Buffer, _mime: string): Promise<string> {
    const destino = path.join(this.baseDir, ruta);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, buffer);
    return `${this.baseUrl}/${ruta}`;
  }
}
