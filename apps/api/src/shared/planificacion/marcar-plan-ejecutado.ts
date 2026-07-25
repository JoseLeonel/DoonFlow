import type { GestionarPlanAuditoriaUseCase } from "../../modules/planificacion/application/casos-uso/gestionar-plan-auditoria.usecase";

export type MarcadorPlanEjecutado = (planId: string, empresaId: string, inspeccionId: string) => Promise<void>;

/**
 * Envuelve `GestionarPlanAuditoriaUseCase` para que `IniciarCertificacionUseCase` (módulo
 * `inspeccion`) vincule un `PlanAuditoria` a la certificación recién iniciada sin instanciar el
 * repositorio de planificación por su cuenta — mismo patrón que `crearRegistradorEventoAuditoria`
 * (010) y `crearRegistradorNotificacion` (006). Un fallo al vincular nunca debe impedir que la
 * certificación se haya iniciado igual (regla 2 de la spec: el plan es solo ayuda de planificación).
 *
 * @example
 *   const marcarPlanEjecutado = crearMarcadorPlanEjecutado(moduloPlanificacion.useCase);
 *   await marcarPlanEjecutado(planId, empresaId, inspeccionId);
 */
export function crearMarcadorPlanEjecutado(useCase: GestionarPlanAuditoriaUseCase): MarcadorPlanEjecutado {
  return async function marcarPlanEjecutado(planId: string, empresaId: string, inspeccionId: string): Promise<void> {
    try {
      await useCase.marcarEjecutada(planId, empresaId, inspeccionId);
    } catch (error) {
      console.error(`[planificacion] No se pudo vincular el plan ${planId} a la certificación ${inspeccionId}:`, error);
    }
  };
}
