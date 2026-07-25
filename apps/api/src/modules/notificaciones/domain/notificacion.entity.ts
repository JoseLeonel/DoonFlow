/**
 * Notificacion — aviso in-app (006-vigencia-notificaciones-portal) de vencimiento próximo,
 * escalamiento, hallazgo crítico o asignación de acción correctiva. Sin dependencias de
 * Express/Prisma.
 */

export type TipoNotificacion =
  | "ACCION_ASIGNADA"
  | "ACCION_POR_VENCER"
  | "ACCION_VENCIDA"
  | "ACCION_ESCALADA"
  | "CERTIFICACION_POR_VENCER"
  | "HALLAZGO_CRITICO";

export type ReferenciaNotificacion = "accion_correctiva" | "inspeccion" | "hallazgo";

export interface Notificacion {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacion;
  referenciaTipo: ReferenciaNotificacion;
  referenciaId: string;
  mensaje: string;
  leidaEn: Date | null;
  enviadaPorCorreo: boolean;
  creadoEn: Date;
  empresaId: string;
}

/**
 * Indica si una acción correctiva vencida debe escalarse a un responsable superior — regla 5
 * de la spec: más de `diasMinimo` días vencida (default 7) sin cambio de estado.
 *
 * @param accion - Acción con su `estado` y `fechaLimite` actuales.
 * @param diasMinimo - Días de gracia antes de escalar (default 7).
 * @param ahora - Instante de referencia (parametrizable para tests).
 * @returns `true` si debe escalarse.
 * @example
 *   debeEscalar({ estado: "VENCIDO", fechaLimite: new Date("2026-07-01") }, 7, new Date("2026-07-10")) // → true
 *   debeEscalar({ estado: "CUMPLIDO", fechaLimite: new Date("2026-01-01") }, 7, new Date("2026-07-10")) // → false
 */
export function debeEscalar(
  accion: { estado: string; fechaLimite: Date },
  diasMinimo = 7,
  ahora: Date = new Date(),
): boolean {
  if (accion.estado !== "VENCIDO") return false;
  const diasVencida = (ahora.getTime() - accion.fechaLimite.getTime()) / (1000 * 60 * 60 * 24);
  return diasVencida > diasMinimo;
}

export interface ContextoMensaje {
  sucursal?: string;
  descripcionAccion?: string;
  diasRestantes?: number;
  periodoEtiqueta?: string | null;
}

/**
 * Arma el texto ya resuelto (no plantilla) de una notificación según su tipo.
 *
 * @param tipo - Tipo de notificación.
 * @param contexto - Datos para interpolar en el mensaje.
 * @returns El mensaje final a mostrar en el listado.
 * @example
 *   construirMensaje("CERTIFICACION_POR_VENCER", { sucursal: "Planta Central", diasRestantes: 15 })
 *   // → "La certificación de Planta Central vence en 15 día(s)."
 */
export function construirMensaje(tipo: TipoNotificacion, contexto: ContextoMensaje): string {
  const sucursal = contexto.sucursal ?? "la sucursal";
  const periodo = contexto.periodoEtiqueta ? ` (${contexto.periodoEtiqueta})` : "";
  const descripcion = contexto.descripcionAccion ?? "la acción";
  const dias = contexto.diasRestantes ?? 0;

  switch (tipo) {
    case "ACCION_ASIGNADA":
      return `Se te asignó la acción correctiva "${descripcion}".`;
    case "ACCION_POR_VENCER":
      return `La acción "${descripcion}" vence en ${dias} día(s).`;
    case "ACCION_VENCIDA":
      return `La acción "${descripcion}" venció.`;
    case "ACCION_ESCALADA":
      return `La acción "${descripcion}" sigue vencida sin actualizarse y fue escalada.`;
    case "CERTIFICACION_POR_VENCER":
      return `La certificación de ${sucursal}${periodo} vence en ${dias} día(s).`;
    case "HALLAZGO_CRITICO":
      return `Se registró un hallazgo crítico en ${sucursal}${periodo}.`;
  }
}
