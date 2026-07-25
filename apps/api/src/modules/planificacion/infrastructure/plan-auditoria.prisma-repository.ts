import type { PrismaClient } from "@prisma/client";
import type {
  AlcanceConsulta,
  DatosCrearPlanAuditoria,
  FiltrosPlanAuditoria,
  PlanAuditoriaConDetalle,
  PlanAuditoriaRepositoryPort,
} from "../domain/plan-auditoria.repository.port";

/**
 * Filtro adicional por alcance — mismo criterio que `sucursales`/`clientes`: para CLIENTE/SUCURSAL,
 * ignora el `sucursalId` solicitado por query param y usa el del alcance, para que un usuario
 * limitado no pueda ampliar su visibilidad pasando un `sucursalId` ajeno.
 */
function whereAlcance(sucursalIdSolicitado: string | undefined, alcance?: AlcanceConsulta): Record<string, unknown> {
  if (!alcance || alcance.tipo === "TOTAL") return sucursalIdSolicitado ? { sucursalId: sucursalIdSolicitado } : {};
  if (alcance.tipo === "CLIENTE") return { sucursal: { clienteId: alcance.clienteId } };
  return { sucursalId: { in: alcance.sucursalIds } };
}

const INCLUDE_DETALLE = {
  sucursal: { select: { nombre: true, cliente: { select: { empresa: true } } } },
  responsableSugerido: { select: { nombre: true } },
} as const;

function mapPlan(p: any): PlanAuditoriaConDetalle {
  return {
    id: p.id,
    sucursalId: p.sucursalId,
    fechaObjetivo: p.fechaObjetivo,
    responsableSugeridoId: p.responsableSugeridoId ?? null,
    estado: p.estado,
    inspeccionId: p.inspeccionId ?? null,
    creadoEn: p.creadoEn,
    empresaId: p.empresaId,
    sucursalNombre: p.sucursal.nombre,
    clienteNombre: p.sucursal.cliente.empresa,
    responsableSugeridoNombre: p.responsableSugerido?.nombre ?? null,
  };
}

export class PlanAuditoriaPrismaRepository implements PlanAuditoriaRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async listar(empresaId: string, filtros: FiltrosPlanAuditoria, alcance?: AlcanceConsulta): Promise<PlanAuditoriaConDetalle[]> {
    const where: Record<string, unknown> = { empresaId, ...whereAlcance(filtros.sucursalId, alcance) };
    if (filtros.mes) {
      const [anio, mes] = filtros.mes.split("-").map(Number);
      const desde = new Date(Date.UTC(anio!, mes! - 1, 1));
      const hasta = new Date(Date.UTC(anio!, mes!, 1));
      where["fechaObjetivo"] = { gte: desde, lt: hasta };
    }

    const filas = await this.prisma.planAuditoria.findMany({
      where, include: INCLUDE_DETALLE, orderBy: { fechaObjetivo: "asc" },
    });
    return filas.map(mapPlan);
  }

  async obtenerPorId(id: string, empresaId: string): Promise<PlanAuditoriaConDetalle | null> {
    const p = await this.prisma.planAuditoria.findFirst({ where: { id, empresaId }, include: INCLUDE_DETALLE });
    return p ? mapPlan(p) : null;
  }

  async crear(datos: DatosCrearPlanAuditoria): Promise<PlanAuditoriaConDetalle> {
    const p = await this.prisma.planAuditoria.create({
      data: {
        empresaId: datos.empresaId,
        sucursalId: datos.sucursalId,
        fechaObjetivo: datos.fechaObjetivo,
        responsableSugeridoId: datos.responsableSugeridoId ?? null,
      },
      include: INCLUDE_DETALLE,
    });
    return mapPlan(p);
  }

  async reprogramar(id: string, empresaId: string, nuevaFecha: Date): Promise<PlanAuditoriaConDetalle> {
    await this.prisma.planAuditoria.updateMany({
      where: { id, empresaId },
      data: { fechaObjetivo: nuevaFecha, estado: "REPROGRAMADA" },
    });
    const p = await this.prisma.planAuditoria.findFirstOrThrow({ where: { id, empresaId }, include: INCLUDE_DETALLE });
    return mapPlan(p);
  }

  async marcarEjecutada(id: string, empresaId: string, inspeccionId: string): Promise<PlanAuditoriaConDetalle> {
    await this.prisma.planAuditoria.updateMany({
      where: { id, empresaId },
      data: { estado: "EJECUTADA", inspeccionId },
    });
    const p = await this.prisma.planAuditoria.findFirstOrThrow({ where: { id, empresaId }, include: INCLUDE_DETALLE });
    return mapPlan(p);
  }
}
