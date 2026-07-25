/**
 * Apelacion — disputa del cliente sobre un hallazgo puntual o sobre el resultado final de una
 * certificación ya firmada (011-aceptacion-apelaciones-certificacion). Sin dependencias de
 * Express/Prisma.
 */

export type TipoApelacion = "SOBRE_HALLAZGO" | "SOBRE_RESULTADO";
export type EstadoApelacion = "ABIERTA" | "EN_REVISION" | "ACEPTADA" | "RECHAZADA";

export interface Apelacion {
  id: string;
  empresaId: string;
  inspeccionId: string;
  hallazgoId: string | null;
  tipo: TipoApelacion;
  motivo: string;
  solicitadoPorId: string;
  solicitadoEn: Date;
  estado: EstadoApelacion;
  resueltoPorId: string | null;
  resueltoEn: Date | null;
  resolucionComentario: string | null;
}

const ESTADOS_RESUELTOS: EstadoApelacion[] = ["ACEPTADA", "RECHAZADA"];

/**
 * Indica si todavía se puede presentar una apelación dentro del plazo desde la firma.
 *
 * @param firmadoEn - Fecha/hora en que se firmó la certificación.
 * @param ahora - Instante de referencia (parametrizable para tests).
 * @param plazoDias - Días de plazo para apelar (`PLAZO_APELACION_DIAS`).
 * @returns `true` si `ahora` está dentro de `firmadoEn + plazoDias` (inclusive).
 * @example
 *   estaDentroDePlazo(new Date("2026-07-01"), new Date("2026-07-06"), 15)  // → true
 *   estaDentroDePlazo(new Date("2026-07-01"), new Date("2026-07-25"), 15)  // → false
 */
export function estaDentroDePlazo(firmadoEn: Date, ahora: Date, plazoDias: number): boolean {
  const limite = new Date(firmadoEn);
  limite.setDate(limite.getDate() + plazoDias);
  return ahora.getTime() <= limite.getTime();
}

/**
 * Separación de funciones: quien firmó la certificación no puede resolver una apelación sobre
 * ella (regla 4 de la spec).
 *
 * @param resolutorId - Usuario autenticado que intenta resolver la apelación.
 * @param firmadoPorId - Quién firmó la certificación original.
 * @returns `true` si el resolutor puede resolver (no es quien firmó).
 * @example
 *   puedeResolver("u2", "u1")  // → true
 *   puedeResolver("u1", "u1")  // → false
 */
export function puedeResolver(resolutorId: string, firmadoPorId: string | null): boolean {
  return resolutorId !== firmadoPorId;
}

export interface CertificacionParaApelar {
  estado: string;
  firmadoEn: Date | null;
  fechaVencimiento: Date | null;
}

/**
 * Indica si se puede presentar una apelación sobre una certificación: debe estar `FIRMADA`,
 * dentro del plazo desde la firma, y no tener `fechaVencimiento` ya pasada.
 *
 * @param certificacion - Certificación con `estado`/`firmadoEn`/`fechaVencimiento`.
 * @param ahora - Instante de referencia (parametrizable para tests).
 * @param plazoDias - Días de plazo para apelar.
 * @returns `true` si se puede apelar.
 * @example
 *   puedeApelar({ estado: "FIRMADA", firmadoEn: new Date("2026-07-01"), fechaVencimiento: null }, new Date("2026-07-05"), 15)  // → true
 *   puedeApelar({ estado: "EN_PROGRESO", firmadoEn: null, fechaVencimiento: null }, new Date(), 15)  // → false
 */
export function puedeApelar(certificacion: CertificacionParaApelar, ahora: Date, plazoDias: number): boolean {
  if (certificacion.estado !== "FIRMADA" || !certificacion.firmadoEn) return false;
  if (certificacion.fechaVencimiento && certificacion.fechaVencimiento < ahora) return false;
  return estaDentroDePlazo(certificacion.firmadoEn, ahora, plazoDias);
}

/**
 * Indica si una apelación ya fue resuelta (`ACEPTADA`/`RECHAZADA`) — no admite una segunda
 * resolución (regla "fuera de alcance" de la spec: una apelación resuelta es definitiva).
 *
 * @param apelacion - Apelación con su `estado` actual.
 * @returns `true` si `estado` es `ACEPTADA` o `RECHAZADA`.
 * @example
 *   yaFueResuelta({ estado: "ABIERTA" } as Apelacion)   // → false
 *   yaFueResuelta({ estado: "ACEPTADA" } as Apelacion)  // → true
 */
export function yaFueResuelta(apelacion: Pick<Apelacion, "estado">): boolean {
  return ESTADOS_RESUELTOS.includes(apelacion.estado);
}
