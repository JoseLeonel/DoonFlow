/**
 * Hallazgo — incumplimiento detectado en una certificación (013-hallazgos-plan-cumplimiento).
 * Sin dependencias de Express/Prisma.
 */

export type Severidad = "CRITICA" | "MAYOR" | "MENOR";
export type ResultadoFinal = "APROBADA" | "APROBADA_CON_OBSERVACIONES" | "RECHAZADA";

export interface Hallazgo {
  id: string;
  inspeccionId: string;
  detalleId: string | null;
  descripcion: string;
  severidad: Severidad;
  creadoEn: Date;
}

export interface DetalleParaHallazgo {
  id: string;
  nodoId: string;
  preguntaTitulo: string;
  puntajeObtenido: number;
  puntajeMaximo: number;
}

export interface DatosHallazgoAuto {
  detalleId: string;
  descripcion: string;
  severidad: Severidad;
}

/**
 * Indica si una respuesta representa un incumplimiento (no alcanzó el puntaje completo).
 *
 * @param detalle - Respuesta guardada de la certificación.
 * @returns `true` si `puntajeObtenido < puntajeMaximo`.
 * @example
 *   esIncumplimiento({ puntajeObtenido: 5, puntajeMaximo: 10 })  // → true
 *   esIncumplimiento({ puntajeObtenido: 10, puntajeMaximo: 10 }) // → false
 */
export function esIncumplimiento(detalle: Pick<DetalleParaHallazgo, "puntajeObtenido" | "puntajeMaximo">): boolean {
  return detalle.puntajeObtenido < detalle.puntajeMaximo;
}

/**
 * Sugiere la severidad de un hallazgo automático según el porcentaje obtenido de la
 * pregunta que lo originó — siempre editable por el auditor antes de generar el plan.
 *
 * @param detalle - Respuesta con `puntajeObtenido`/`puntajeMaximo`.
 * @returns `"CRITICA"` si 0%; `"MAYOR"` si 1–49%; `"MENOR"` si 50–99%.
 * @example
 *   severidadPorDefecto({ puntajeObtenido: 0, puntajeMaximo: 10 })  // → "CRITICA"
 *   severidadPorDefecto({ puntajeObtenido: 3, puntajeMaximo: 10 })  // → "MAYOR"
 *   severidadPorDefecto({ puntajeObtenido: 7, puntajeMaximo: 10 })  // → "MENOR"
 */
export function severidadPorDefecto(detalle: Pick<DetalleParaHallazgo, "puntajeObtenido" | "puntajeMaximo">): Severidad {
  const porcentaje = detalle.puntajeMaximo > 0 ? (detalle.puntajeObtenido / detalle.puntajeMaximo) * 100 : 0;
  if (porcentaje <= 0) return "CRITICA";
  if (porcentaje < 50) return "MAYOR";
  return "MENOR";
}

/**
 * Genera los hallazgos candidatos a partir de las respuestas de una certificación: uno por
 * cada detalle que no alcanzó el puntaje completo, con la severidad sugerida por
 * `severidadPorDefecto`. El caso de uso decide cuáles ya existen (idempotencia por `detalleId`).
 *
 * @param detalles - Respuestas guardadas de la certificación.
 * @returns Un candidato de hallazgo por cada respuesta incumplida (`[]` si todas cumplen).
 * @example
 *   generarHallazgosDesdeDetalles([{ id: "d1", nodoId: "n1", preguntaTitulo: "Extintor vigente", puntajeObtenido: 0, puntajeMaximo: 10 }])
 *   // → [{ detalleId: "d1", descripcion: "Incumplimiento: Extintor vigente", severidad: "CRITICA" }]
 */
export function generarHallazgosDesdeDetalles(detalles: DetalleParaHallazgo[]): DatosHallazgoAuto[] {
  return detalles
    .filter((d) => esIncumplimiento(d))
    .map((d) => ({
      detalleId: d.id,
      descripcion: `Incumplimiento: ${d.preguntaTitulo}`,
      severidad: severidadPorDefecto(d),
    }));
}

/**
 * Calcula el resultado final de una certificación según la severidad de sus hallazgos.
 * Consumido por 005 (`firmar-certificacion.usecase.ts`) a través de `sp_inspeccion_firmar` —
 * ver dependencia cruzada documentada en `spec.md` → "Contexto". La firma se rechaza por
 * completo (a nivel de SP) si hay un hallazgo `CRITICA` sin ninguna acción `CUMPLIDO`; esta
 * función solo calcula el resultado entre los casos que sí pueden firmarse.
 *
 * @param hallazgos - Hallazgos registrados para la certificación (puede ser `[]`).
 * @returns `"APROBADA"` si no hay hallazgos; `"APROBADA_CON_OBSERVACIONES"` si el peor
 *          hallazgo es `MAYOR` o `MENOR`; `"RECHAZADA"` si existe al menos un hallazgo `CRITICA`.
 * @example
 *   calcularResultadoFinal([])                                  // → "APROBADA"
 *   calcularResultadoFinal([{ severidad: "MENOR" } as Hallazgo]) // → "APROBADA_CON_OBSERVACIONES"
 *   calcularResultadoFinal([{ severidad: "CRITICA" } as Hallazgo]) // → "RECHAZADA"
 */
export function calcularResultadoFinal(hallazgos: Pick<Hallazgo, "severidad">[]): ResultadoFinal {
  if (hallazgos.length === 0) return "APROBADA";
  if (hallazgos.some((h) => h.severidad === "CRITICA")) return "RECHAZADA";
  return "APROBADA_CON_OBSERVACIONES";
}
