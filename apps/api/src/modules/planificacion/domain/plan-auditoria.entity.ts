/**
 * PlanAuditoria — certificación futura programada para una sucursal (014-panel-calendario-biblioteca,
 * HU-5). Ayuda de planificación, no bloquea iniciar una certificación fuera de calendario
 * (regla 2 de la spec). Sin dependencias de Express/Prisma.
 */

export type EstadoPlanAuditoria = "PROGRAMADA" | "EJECUTADA" | "REPROGRAMADA";

export interface PlanAuditoria {
  id: string;
  sucursalId: string;
  fechaObjetivo: Date;
  responsableSugeridoId: string | null;
  estado: EstadoPlanAuditoria;
  inspeccionId: string | null;
  creadoEn: Date;
  empresaId: string;
}

/**
 * Indica si un plan de auditoría todavía puede reprogramarse — no si ya se ejecutó.
 *
 * @param plan - Plan con su `estado` actual.
 * @returns `true` si `estado !== "EJECUTADA"`.
 * @example
 *   puedeReprogramarse({ estado: "PROGRAMADA" } as PlanAuditoria)  // → true
 *   puedeReprogramarse({ estado: "EJECUTADA" } as PlanAuditoria)   // → false
 */
export function puedeReprogramarse(plan: Pick<PlanAuditoria, "estado">): boolean {
  return plan.estado !== "EJECUTADA";
}

/**
 * Vincula el plan a la certificación que lo originó — se llama al iniciar la certificación
 * (no al firmarla, ver desviación documentada en `impl.md`), marcándolo `EJECUTADA`.
 *
 * @param plan - Plan a vincular.
 * @param inspeccionId - Id de la certificación recién iniciada.
 * @returns Copia del plan con `estado: "EJECUTADA"` e `inspeccionId` asignado.
 * @example
 *   vincularInspeccion({ estado: "PROGRAMADA", inspeccionId: null } as PlanAuditoria, "insp1")
 *   // → { estado: "EJECUTADA", inspeccionId: "insp1", ... }
 */
export function vincularInspeccion<T extends Pick<PlanAuditoria, "estado" | "inspeccionId">>(
  plan: T,
  inspeccionId: string,
): T {
  return { ...plan, estado: "EJECUTADA", inspeccionId };
}
