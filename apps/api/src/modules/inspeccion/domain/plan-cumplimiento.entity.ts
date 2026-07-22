import { calcularEstadoEfectivo, type AccionCorrectiva } from "./accion-correctiva.entity";
import type { Hallazgo } from "./hallazgo.entity";

export type EstadoPlan = "EN_SEGUIMIENTO" | "CERRADO" | "REABIERTO";

export interface PlanCumplimiento {
  id: string;
  inspeccionId: string;
  estado: EstadoPlan;
  cerradoPorId: string | null;
  cerradoEn: Date | null;
  creadoEn: Date;
}

export interface IndicadoresPlan {
  total: number;
  pendientes: number;
  enProceso: number;
  enRevision: number;
  cumplidas: number;
  noCumplidas: number;
  vencidas: number;
  porcentajeCumplimiento: number;
  proximasAVencer: number;
}

/**
 * Indica si puede generarse un plan de cumplimiento para una certificación: requiere al menos
 * un hallazgo registrado (automático o manual).
 *
 * @param hallazgos - Hallazgos de la certificación.
 * @returns `true` si hay al menos un hallazgo.
 * @example
 *   puedeGenerarse([])                          // → false
 *   puedeGenerarse([{ severidad: "MENOR" } as Hallazgo]) // → true
 */
export function puedeGenerarse(hallazgos: Pick<Hallazgo, "id">[]): boolean {
  return hallazgos.length > 0;
}

/**
 * Indica si un plan de cumplimiento puede cerrarse (regla 2 de 013): cada hallazgo de la
 * certificación debe tener al menos una acción correctiva en estado `CUMPLIDO`.
 *
 * @param hallazgos - Hallazgos de la certificación.
 * @param acciones - Acciones correctivas del plan.
 * @returns `true` si todos los hallazgos tienen al menos una acción `CUMPLIDO`.
 * @example
 *   puedeCerrarse([{ id: "h1" } as Hallazgo], [{ hallazgoId: "h1", estado: "CUMPLIDO" } as AccionCorrectiva]) // → true
 *   puedeCerrarse([{ id: "h1" } as Hallazgo], []) // → false
 */
export function puedeCerrarse(hallazgos: Pick<Hallazgo, "id">[], acciones: Pick<AccionCorrectiva, "hallazgoId" | "estado">[]): boolean {
  return hallazgos.every((h) => acciones.some((a) => a.hallazgoId === h.id && a.estado === "CUMPLIDO"));
}

/**
 * Replica en TypeScript el agregado que calcula `sp_plan_cumplimiento_indicadores` — usada solo
 * cuando el caso de uso ya tiene las acciones en memoria y no necesita ir a BD; la lectura real
 * de la pantalla del plan usa el SP como fuente de verdad (ver `plan-cumplimiento.repository.port.ts`).
 *
 * @param acciones - Acciones correctivas del plan.
 * @param ahora - Instante de referencia para "vencida"/"próxima a vencer" (parametrizable para tests).
 * @returns Los 9 indicadores del plan.
 * @example
 *   calcularIndicadores([]) // → { total: 0, pendientes: 0, ..., porcentajeCumplimiento: 0, proximasAVencer: 0 }
 */
export function calcularIndicadores(acciones: AccionCorrectiva[], ahora: Date = new Date()): IndicadoresPlan {
  const enSieteDias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const efectivos = acciones.map((a) => calcularEstadoEfectivo(a, ahora));

  const total = acciones.length;
  const cumplidas = efectivos.filter((e) => e === "CUMPLIDO").length;

  return {
    total,
    pendientes: efectivos.filter((e) => e === "PENDIENTE").length,
    enProceso: efectivos.filter((e) => e === "EN_PROCESO").length,
    enRevision: efectivos.filter((e) => e === "EN_REVISION").length,
    cumplidas,
    noCumplidas: efectivos.filter((e) => e === "NO_CUMPLIDO").length,
    vencidas: efectivos.filter((e) => e === "VENCIDO").length,
    porcentajeCumplimiento: total > 0 ? Math.round((cumplidas / total) * 10000) / 100 : 0,
    proximasAVencer: acciones.filter((a, i) => {
      const noTerminal = efectivos[i] !== "CUMPLIDO" && efectivos[i] !== "NO_CUMPLIDO";
      return noTerminal && a.fechaLimite >= ahora && a.fechaLimite <= enSieteDias;
    }).length,
  };
}
