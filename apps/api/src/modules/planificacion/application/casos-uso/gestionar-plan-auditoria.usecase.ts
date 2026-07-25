import { puedeReprogramarse } from "../../domain/plan-auditoria.entity";
import { PlanAuditoriaNoEncontradoError, PlanAuditoriaNoReprogramableError } from "../../domain/plan-auditoria.errors";
import type { AlcanceConsulta, FiltrosPlanAuditoria, PlanAuditoriaRepositoryPort } from "../../domain/plan-auditoria.repository.port";
import type { ProgramarPlanAuditoriaInput } from "../plan-auditoria.schema";

/**
 * Gestiona el calendario de auditorías (014-panel-calendario-biblioteca, HU-5): programar,
 * reprogramar e "iniciar ahora" (no bloquea si se llama fuera de la fecha objetivo, regla 2).
 */
export class GestionarPlanAuditoriaUseCase {
  constructor(private readonly repo: PlanAuditoriaRepositoryPort) {}

  listar(empresaId: string, filtros: FiltrosPlanAuditoria, alcance?: AlcanceConsulta) {
    return this.repo.listar(empresaId, filtros, alcance);
  }

  programar(empresaId: string, input: ProgramarPlanAuditoriaInput) {
    return this.repo.crear({
      empresaId,
      sucursalId: input.sucursalId,
      fechaObjetivo: input.fechaObjetivo,
      responsableSugeridoId: input.responsableSugeridoId ?? null,
    });
  }

  async reprogramar(id: string, empresaId: string, nuevaFecha: Date) {
    const plan = await this.obtener(id, empresaId);
    if (!puedeReprogramarse(plan)) throw new PlanAuditoriaNoReprogramableError();
    return this.repo.reprogramar(id, empresaId, nuevaFecha);
  }

  /** `iniciarAhora` es solo informativo para el frontend (a qué ruta redirigir) — no cambia el plan aquí; el plan se vincula cuando la certificación efectivamente se inicia (ver `IniciarCertificacionUseCase`). */
  async iniciarAhora(id: string, empresaId: string) {
    const plan = await this.obtener(id, empresaId);
    return { redirigirA: `/certificaciones/nueva?sucursalId=${plan.sucursalId}&planId=${plan.id}` };
  }

  async marcarEjecutada(id: string, empresaId: string, inspeccionId: string) {
    await this.obtener(id, empresaId);
    return this.repo.marcarEjecutada(id, empresaId, inspeccionId);
  }

  private async obtener(id: string, empresaId: string) {
    const plan = await this.repo.obtenerPorId(id, empresaId);
    if (!plan) throw new PlanAuditoriaNoEncontradoError(id);
    return plan;
  }
}
