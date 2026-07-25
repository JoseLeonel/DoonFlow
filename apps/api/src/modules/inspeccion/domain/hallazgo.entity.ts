/**
 * Hallazgo — incumplimiento detectado en una certificación (013-hallazgos-plan-cumplimiento).
 * Sin dependencias de Express/Prisma.
 */

export type Severidad = "CRITICA" | "MAYOR" | "MENOR";
export type ResultadoFinal = "APROBADA" | "APROBADA_CON_OBSERVACIONES" | "RECHAZADA";
/** 011-aceptacion-apelaciones-certificacion — separado de `severidad` para no romper `calcularResultadoFinal`. */
export type EstadoHallazgo = "ACTIVO" | "ANULADO_POR_APELACION";
/**
 * 2026-07-25 — clasificación del reporte de hallazgos pedida por el cliente (revisión de audios
 * WhatsApp 2026-06-03): solo NO_CONFORMIDAD lleva `severidad` y participa en `calcularResultadoFinal`
 * / plan de cumplimiento. Las otras 3 se generan desde los 3 comentarios siempre visibles de cada
 * pregunta (`InspeccionDetalle.comentarioReconocimiento/Observacion/OportunidadMejora`) y son
 * puramente informativas en el PDF.
 */
export type CategoriaHallazgo = "NO_CONFORMIDAD" | "RECONOCIMIENTO" | "OBSERVACION" | "OPORTUNIDAD_MEJORA";

export interface Hallazgo {
  id: string;
  inspeccionId: string;
  detalleId: string | null;
  descripcion: string;
  categoria: CategoriaHallazgo;
  /** `null` para categorías distintas de NO_CONFORMIDAD. */
  severidad: Severidad | null;
  estado: EstadoHallazgo;
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
  categoria: "NO_CONFORMIDAD";
}

/** Categorías generadas desde los 3 comentarios siempre visibles de la pregunta (2026-07-25). */
export type CategoriaComentario = Extract<CategoriaHallazgo, "RECONOCIMIENTO" | "OBSERVACION" | "OPORTUNIDAD_MEJORA">;

export interface DetalleParaComentarios {
  id: string;
  preguntaTitulo: string;
  comentarioReconocimiento: string | null;
  comentarioObservacion: string | null;
  comentarioOportunidadMejora: string | null;
}

export interface DatosHallazgoComentario {
  detalleId: string;
  descripcion: string;
  categoria: CategoriaComentario;
}

const CAMPO_POR_CATEGORIA: [keyof Pick<DetalleParaComentarios, "comentarioReconocimiento" | "comentarioObservacion" | "comentarioOportunidadMejora">, CategoriaComentario][] = [
  ["comentarioReconocimiento", "RECONOCIMIENTO"],
  ["comentarioObservacion", "OBSERVACION"],
  ["comentarioOportunidadMejora", "OPORTUNIDAD_MEJORA"],
];

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
      categoria: "NO_CONFORMIDAD" as const,
    }));
}

/**
 * Genera los hallazgos informativos candidatos a partir de los 3 comentarios siempre visibles
 * de cada pregunta (2026-07-25, pedido explícito del cliente en la revisión de audios WhatsApp
 * 2026-06-03): uno por cada comentario no vacío, sin severidad. El caso de uso decide cuáles ya
 * existen (idempotencia por `detalleId` + `categoria`, ver `HallazgoRepositoryPort.listarClavesComentarioConHallazgo`).
 *
 * @param detalles - Respuestas guardadas de la certificación, con sus 3 comentarios.
 * @returns Un candidato por cada comentario no vacío (`[]` si ninguna pregunta tiene comentarios).
 * @example
 *   generarHallazgosDesdeComentarios([{ id: "d1", preguntaTitulo: "Extintor vigente", comentarioReconocimiento: "Buen mantenimiento", comentarioObservacion: null, comentarioOportunidadMejora: null }])
 *   // → [{ detalleId: "d1", descripcion: "Buen mantenimiento", categoria: "RECONOCIMIENTO" }]
 */
export function generarHallazgosDesdeComentarios(detalles: DetalleParaComentarios[]): DatosHallazgoComentario[] {
  const candidatos: DatosHallazgoComentario[] = [];
  for (const d of detalles) {
    for (const [campo, categoria] of CAMPO_POR_CATEGORIA) {
      const texto = d[campo]?.trim();
      if (texto) candidatos.push({ detalleId: d.id, descripcion: texto, categoria });
    }
  }
  return candidatos;
}

/**
 * Calcula el resultado final de una certificación según la severidad de sus hallazgos.
 * Consumido por 005 (`firmar-certificacion.usecase.ts`) a través de `sp_inspeccion_firmar` —
 * ver dependencia cruzada documentada en `spec.md` → "Contexto". La firma se rechaza por
 * completo (a nivel de SP) si hay un hallazgo `CRITICA` sin ninguna acción `CUMPLIDO`; esta
 * función solo calcula el resultado entre los casos que sí pueden firmarse.
 *
 * @param hallazgos - Hallazgos registrados para la certificación (puede ser `[]`, y puede incluir
 *   hallazgos informativos RECONOCIMIENTO/OBSERVACION/OPORTUNIDAD_MEJORA sin `severidad` — se
 *   ignoran por completo en este cálculo, solo cuentan los NO_CONFORMIDAD).
 * @returns `"APROBADA"` si no hay hallazgos de no conformidad; `"APROBADA_CON_OBSERVACIONES"` si
 *          el peor es `MAYOR` o `MENOR`; `"RECHAZADA"` si existe al menos uno `CRITICA`.
 * @example
 *   calcularResultadoFinal([])                                  // → "APROBADA"
 *   calcularResultadoFinal([{ severidad: "MENOR" } as Hallazgo]) // → "APROBADA_CON_OBSERVACIONES"
 *   calcularResultadoFinal([{ severidad: "CRITICA" } as Hallazgo]) // → "RECHAZADA"
 *   calcularResultadoFinal([{ severidad: null } as Hallazgo])   // → "APROBADA" (solo reconocimientos)
 */
export function calcularResultadoFinal(hallazgos: Pick<Hallazgo, "severidad">[]): ResultadoFinal {
  const deNoConformidad = hallazgos.filter((h) => h.severidad != null);
  if (deNoConformidad.length === 0) return "APROBADA";
  if (deNoConformidad.some((h) => h.severidad === "CRITICA")) return "RECHAZADA";
  return "APROBADA_CON_OBSERVACIONES";
}

/**
 * Devuelve una copia del hallazgo con `estado: "ANULADO_POR_APELACION"` — nunca se borra
 * (011-aceptacion-apelaciones-certificacion, regla 2 de la spec).
 *
 * @param hallazgo - Hallazgo a anular.
 * @returns Copia del hallazgo con `estado: "ANULADO_POR_APELACION"`.
 * @example
 *   anularHallazgoPorApelacion({ estado: "ACTIVO" } as Hallazgo).estado  // → "ANULADO_POR_APELACION"
 */
export function anularHallazgoPorApelacion<T extends Pick<Hallazgo, "estado">>(hallazgo: T): T {
  return { ...hallazgo, estado: "ANULADO_POR_APELACION" };
}

/**
 * Recalcula `resultadoFinal` a partir de todos los hallazgos de la certificación, excluyendo
 * del cálculo los que quedaron `ANULADO_POR_APELACION` (011-aceptacion-apelaciones-certificacion).
 * Reutiliza `calcularResultadoFinal` (regla de severidad 1.1 de 013) sin cambiarla.
 *
 * @param hallazgos - Todos los hallazgos de la certificación (activos y anulados).
 * @returns El `resultadoFinal` recalculado solo con los hallazgos `ACTIVO`.
 * @example
 *   recalcularResultadoFinalExcluyendoAnulados([{ severidad: "CRITICA", estado: "ANULADO_POR_APELACION" }, { severidad: "MENOR", estado: "ACTIVO" }] as Hallazgo[])
 *   // → "APROBADA_CON_OBSERVACIONES"
 */
export function recalcularResultadoFinalExcluyendoAnulados(
  hallazgos: Pick<Hallazgo, "severidad" | "estado">[],
): ResultadoFinal {
  return calcularResultadoFinal(hallazgos.filter((h) => h.estado === "ACTIVO"));
}
