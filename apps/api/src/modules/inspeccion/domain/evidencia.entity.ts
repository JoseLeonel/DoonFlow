/**
 * Reglas de dominio compartidas para evidencia adjunta (foto/documento).
 * Reutilizadas por `InspeccionEvidencia` (este sprint) y, más adelante,
 * por `HallazgoEvidencia`/`AccionCorrectivaEvidencia` (013). Sin dependencias
 * de Express/Prisma/multer.
 */

const MIME_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Verifica si el tipo MIME del archivo está permitido (jpg/png/heic/pdf/doc/docx).
 *
 * @param mime - Tipo MIME reportado por el archivo subido.
 * @returns `true` si el tipo está en la lista permitida.
 * @example
 *   tipoArchivoPermitido("image/png")  // → true
 *   tipoArchivoPermitido("video/mp4")  // → false
 */
export function tipoArchivoPermitido(mime: string): boolean {
  return MIME_PERMITIDOS.includes(mime);
}

/**
 * Verifica que el tamaño del archivo no exceda el máximo permitido (10 MB).
 *
 * @param bytes - Tamaño del archivo en bytes.
 * @returns `true` si el archivo no excede 10 MB.
 * @example
 *   tamanoArchivoValido(1_000_000)   // → true
 *   tamanoArchivoValido(20_000_000)  // → false
 */
export function tamanoArchivoValido(bytes: number): boolean {
  return bytes > 0 && bytes <= TAMANO_MAXIMO_BYTES;
}

/**
 * Construye la ruta de almacenamiento de una evidencia según la convención del proyecto:
 * `certificaciones/{empresaId}/{inspeccionId}/{detalleId}/{archivo}`.
 *
 * @param empresaId - Empresa tenant dueña de la certificación.
 * @param inspeccionId - Certificación (Inspeccion) a la que pertenece la evidencia.
 * @param detalleId - Respuesta (InspeccionDetalle) a la que se adjunta.
 * @param archivo - Nombre de archivo final (ya sanitizado).
 * @returns Ruta relativa dentro del bucket de almacenamiento.
 * @example
 *   construirRutaAlmacenamiento("e1", "i1", "d1", "foto.jpg")
 *   // → "certificaciones/e1/i1/d1/foto.jpg"
 */
export function construirRutaAlmacenamiento(
  empresaId: string,
  inspeccionId: string,
  detalleId: string,
  archivo: string,
): string {
  return `certificaciones/${empresaId}/${inspeccionId}/${detalleId}/${archivo}`;
}
