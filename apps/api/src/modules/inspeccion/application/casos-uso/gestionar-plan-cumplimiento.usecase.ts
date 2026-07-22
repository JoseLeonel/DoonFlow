import { puedeCerrarse, puedeGenerarse } from "../../domain/plan-cumplimiento.entity";
import { puedeVerificar } from "../../domain/accion-correctiva.entity";
import {
  InspeccionNoEncontradaError,
  PlanCumplimientoConHallazgosSinAccionError,
  PlanCumplimientoNoEncontradoError,
  PlanCumplimientoSinHallazgosError,
  PlanCumplimientoYaExisteError,
  SinPermisoVerificacionError,
} from "../../domain/inspeccion.errors";
import type { AlcanceConsulta, CertificacionRepositoryPort } from "../../domain/certificacion.repository.port";
import type { HallazgoRepositoryPort } from "../../domain/hallazgo.repository.port";
import type { AccionCorrectivaRepositoryPort } from "../../domain/accion-correctiva.repository.port";
import type { PlanCumplimientoRepositoryPort } from "../../domain/plan-cumplimiento.repository.port";

export interface UsuarioAutenticado {
  id: string;
  rol: string;
}

/**
 * Gestiona el ciclo de vida del plan de cumplimiento: generación (requiere ≥1 hallazgo),
 * consulta con indicadores agregados, cierre (requiere todos los hallazgos cubiertos por
 * al menos una acción `CUMPLIDO`) y reapertura.
 */
export class GestionarPlanCumplimientoUseCase {
  constructor(
    private readonly repo: PlanCumplimientoRepositoryPort,
    private readonly hallazgoRepo: HallazgoRepositoryPort,
    private readonly accionRepo: AccionCorrectivaRepositoryPort,
    private readonly certificacionRepo: CertificacionRepositoryPort,
  ) {}

  async generar(inspeccionId: string, empresaId: string, alcance?: AlcanceConsulta) {
    await this.validarAcceso(inspeccionId, empresaId, alcance);

    const existente = await this.repo.obtenerPorInspeccion(inspeccionId, empresaId);
    if (existente) throw new PlanCumplimientoYaExisteError();

    const hallazgos = await this.hallazgoRepo.listarPorInspeccion(inspeccionId, empresaId);
    if (!puedeGenerarse(hallazgos)) throw new PlanCumplimientoSinHallazgosError();

    return this.repo.crear(inspeccionId);
  }

  async obtenerConIndicadores(inspeccionId: string, empresaId: string, alcance?: AlcanceConsulta) {
    await this.validarAcceso(inspeccionId, empresaId, alcance);

    const plan = await this.repo.obtenerPorInspeccion(inspeccionId, empresaId);
    if (!plan) throw new PlanCumplimientoNoEncontradoError(inspeccionId);

    const [acciones, indicadores] = await Promise.all([
      this.accionRepo.listarPorPlan(plan.id, empresaId),
      this.repo.obtenerIndicadores(plan.id),
    ]);
    return { ...plan, acciones, indicadores };
  }

  async cerrar(planId: string, empresaId: string, usuario: UsuarioAutenticado) {
    if (!puedeVerificar(usuario)) throw new SinPermisoVerificacionError();

    const plan = await this.repo.obtenerPorId(planId, empresaId);
    if (!plan) throw new PlanCumplimientoNoEncontradoError(planId);

    const [hallazgos, acciones] = await Promise.all([
      this.hallazgoRepo.listarPorInspeccion(plan.inspeccionId, empresaId),
      this.accionRepo.listarPorPlan(planId, empresaId),
    ]);
    if (!puedeCerrarse(hallazgos, acciones)) throw new PlanCumplimientoConHallazgosSinAccionError();

    return this.repo.cerrar(planId, usuario.id);
  }

  async reabrir(planId: string, empresaId: string, usuario: UsuarioAutenticado) {
    if (!puedeVerificar(usuario)) throw new SinPermisoVerificacionError();

    const plan = await this.repo.obtenerPorId(planId, empresaId);
    if (!plan) throw new PlanCumplimientoNoEncontradoError(planId);

    return this.repo.reabrir(planId);
  }

  private async validarAcceso(inspeccionId: string, empresaId: string, alcance?: AlcanceConsulta) {
    const certificacion = await this.certificacionRepo.obtenerCompleta(inspeccionId, empresaId, alcance);
    if (!certificacion) throw new InspeccionNoEncontradaError(inspeccionId);
    return certificacion;
  }
}
