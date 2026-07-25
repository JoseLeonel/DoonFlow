import type { PrismaClient } from "@prisma/client";
import { formatearFechaCalendario } from "@doonflow/shared";
import type {
  ApelacionConDetalle,
  ApelacionRepositoryPort,
  DatosCrearApelacion,
  DatosResolverApelacion,
} from "../domain/apelacion.repository.port";

const INCLUDE_DETALLE = {
  solicitadoPor: { select: { nombre: true } },
  inspeccion: {
    select: {
      periodoEtiqueta: true,
      fechaInicioPeriodo: true,
      fechaFinPeriodo: true,
      sucursal: { select: { nombre: true } },
    },
  },
} as const;

function etiquetaInspeccion(inspeccion: {
  periodoEtiqueta: string | null;
  fechaInicioPeriodo: Date | null;
  fechaFinPeriodo: Date | null;
  sucursal: { nombre: string } | null;
}): string {
  const sucursal = inspeccion.sucursal?.nombre ?? "Sin sucursal";
  const periodo = inspeccion.fechaInicioPeriodo && inspeccion.fechaFinPeriodo
    ? `${formatearFechaCalendario(inspeccion.fechaInicioPeriodo)} – ${formatearFechaCalendario(inspeccion.fechaFinPeriodo)}`
    : inspeccion.periodoEtiqueta;
  return periodo ? `${sucursal} — ${periodo}` : sucursal;
}

function mapApelacion(a: any): ApelacionConDetalle {
  return {
    id: a.id,
    empresaId: a.empresaId,
    inspeccionId: a.inspeccionId,
    hallazgoId: a.hallazgoId ?? null,
    tipo: a.tipo,
    motivo: a.motivo,
    solicitadoPorId: a.solicitadoPorId,
    solicitadoEn: a.solicitadoEn,
    estado: a.estado,
    resueltoPorId: a.resueltoPorId ?? null,
    resueltoEn: a.resueltoEn ?? null,
    resolucionComentario: a.resolucionComentario ?? null,
    solicitadoPorNombre: a.solicitadoPor?.nombre ?? "",
    inspeccionEtiqueta: etiquetaInspeccion(a.inspeccion),
  };
}

export class ApelacionPrismaRepository implements ApelacionRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(datos: DatosCrearApelacion): Promise<ApelacionConDetalle> {
    const a = await this.prisma.apelacion.create({
      data: {
        empresaId: datos.empresaId,
        inspeccionId: datos.inspeccionId,
        hallazgoId: datos.hallazgoId,
        tipo: datos.tipo,
        motivo: datos.motivo,
        solicitadoPorId: datos.solicitadoPorId,
      },
      include: INCLUDE_DETALLE,
    });
    return mapApelacion(a);
  }

  async obtenerPorId(id: string, empresaId: string): Promise<ApelacionConDetalle | null> {
    const a = await this.prisma.apelacion.findFirst({ where: { id, empresaId }, include: INCLUDE_DETALLE });
    return a ? mapApelacion(a) : null;
  }

  async listarAbiertas(empresaId: string): Promise<ApelacionConDetalle[]> {
    const filas = await this.prisma.apelacion.findMany({
      where: { empresaId, estado: { in: ["ABIERTA", "EN_REVISION"] } },
      orderBy: { solicitadoEn: "asc" },
      include: INCLUDE_DETALLE,
    });
    return filas.map(mapApelacion);
  }

  async listarPorInspeccion(inspeccionId: string, empresaId: string): Promise<ApelacionConDetalle[]> {
    const filas = await this.prisma.apelacion.findMany({
      where: { inspeccionId, empresaId },
      orderBy: { solicitadoEn: "asc" },
      include: INCLUDE_DETALLE,
    });
    return filas.map(mapApelacion);
  }

  async resolver(id: string, empresaId: string, datos: DatosResolverApelacion): Promise<ApelacionConDetalle> {
    await this.prisma.apelacion.updateMany({
      where: { id, empresaId },
      data: {
        estado: datos.estado,
        resueltoPorId: datos.resueltoPorId,
        resueltoEn: new Date(),
        resolucionComentario: datos.resolucionComentario,
      },
    });
    const a = await this.prisma.apelacion.findFirstOrThrow({ where: { id, empresaId }, include: INCLUDE_DETALLE });
    return mapApelacion(a);
  }
}
