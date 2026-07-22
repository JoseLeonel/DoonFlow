import type { PrismaClient } from "@prisma/client";
import type { IndicadoresPlan, PlanCumplimiento } from "../domain/plan-cumplimiento.entity";
import type { PlanCumplimientoRepositoryPort } from "../domain/plan-cumplimiento.repository.port";

function mapPlan(p: any): PlanCumplimiento {
  return {
    id: p.id,
    inspeccionId: p.inspeccionId,
    estado: p.estado,
    cerradoPorId: p.cerradoPorId ?? null,
    cerradoEn: p.cerradoEn ?? null,
    creadoEn: p.creadoEn,
  };
}

/** Mapea la fila cruda (snake_case) que retorna `sp_plan_cumplimiento_indicadores` vía `$queryRaw`. */
function mapIndicadores(i: any): IndicadoresPlan {
  return {
    total: Number(i.total),
    pendientes: Number(i.pendientes),
    enProceso: Number(i.en_proceso),
    enRevision: Number(i.en_revision),
    cumplidas: Number(i.cumplidas),
    noCumplidas: Number(i.no_cumplidas),
    vencidas: Number(i.vencidas),
    porcentajeCumplimiento: Number(i.porcentaje_cumplimiento),
    proximasAVencer: Number(i.proximas_a_vencer),
  };
}

export class PlanCumplimientoPrismaRepository implements PlanCumplimientoRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerPorInspeccion(inspeccionId: string, empresaId: string): Promise<PlanCumplimiento | null> {
    const p = await this.prisma.planCumplimiento.findFirst({
      where: { inspeccionId, inspeccion: { empresaId } },
    });
    return p ? mapPlan(p) : null;
  }

  async obtenerPorId(id: string, empresaId: string): Promise<PlanCumplimiento | null> {
    const p = await this.prisma.planCumplimiento.findFirst({ where: { id, inspeccion: { empresaId } } });
    return p ? mapPlan(p) : null;
  }

  async crear(inspeccionId: string): Promise<PlanCumplimiento> {
    const p = await this.prisma.planCumplimiento.create({ data: { inspeccionId } });
    return mapPlan(p);
  }

  async cerrar(id: string, cerradoPorId: string): Promise<PlanCumplimiento> {
    const p = await this.prisma.planCumplimiento.update({
      where: { id },
      data: { estado: "CERRADO", cerradoPorId, cerradoEn: new Date() },
    });
    return mapPlan(p);
  }

  async reabrir(id: string): Promise<PlanCumplimiento> {
    const p = await this.prisma.planCumplimiento.update({
      where: { id },
      data: { estado: "REABIERTO", cerradoPorId: null, cerradoEn: null },
    });
    return mapPlan(p);
  }

  async obtenerIndicadores(id: string): Promise<IndicadoresPlan> {
    const filas = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM sp_plan_cumplimiento_indicadores(${id})
    `;
    return mapIndicadores(filas[0]);
  }
}
