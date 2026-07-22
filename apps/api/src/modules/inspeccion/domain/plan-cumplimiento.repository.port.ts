import type { IndicadoresPlan, PlanCumplimiento } from "./plan-cumplimiento.entity";

export interface PlanCumplimientoRepositoryPort {
  /** Obtiene el plan de cumplimiento de una certificación (`null` si todavía no existe). */
  obtenerPorInspeccion(inspeccionId: string, empresaId: string): Promise<PlanCumplimiento | null>;

  /** Obtiene un plan por su propio id. */
  obtenerPorId(id: string, empresaId: string): Promise<PlanCumplimiento | null>;

  /** Crea la cabecera del plan en `EN_SEGUIMIENTO`. */
  crear(inspeccionId: string): Promise<PlanCumplimiento>;

  /** Cierra el plan (`estado = CERRADO`), registrando quién y cuándo. */
  cerrar(id: string, cerradoPorId: string): Promise<PlanCumplimiento>;

  /** Reabre un plan cerrado (`estado = REABIERTO`). */
  reabrir(id: string): Promise<PlanCumplimiento>;

  /** Indicadores agregados del plan, vía `sp_plan_cumplimiento_indicadores` (fuente de verdad de lectura). */
  obtenerIndicadores(id: string): Promise<IndicadoresPlan>;
}
