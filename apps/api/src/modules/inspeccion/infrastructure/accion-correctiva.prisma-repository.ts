import type { PrismaClient } from "@prisma/client";
import { calcularEstadoEfectivo, type AccionCorrectiva } from "../domain/accion-correctiva.entity";
import type { AlcanceConsulta } from "../domain/certificacion.repository.port";
import type {
  AccionCorrectivaConEvidencias,
  AccionCorrectivaConOrigen,
  AccionCorrectivaEvidenciaGuardada,
  AccionCorrectivaRepositoryPort,
  DatosActualizarAccion,
  DatosCrearAccion,
  DatosVerificarAccion,
} from "../domain/accion-correctiva.repository.port";

function mapEvidencia(e: any): AccionCorrectivaEvidenciaGuardada {
  return {
    id: e.id,
    accionCorrectivaId: e.accionCorrectivaId,
    tipo: e.tipo,
    url: e.url,
    nombre: e.nombre,
    comentario: e.comentario ?? null,
    creadoEn: e.creadoEn,
  };
}

function mapAccion(a: any): AccionCorrectivaConEvidencias {
  return {
    id: a.id,
    planCumplimientoId: a.planCumplimientoId,
    hallazgoId: a.hallazgoId,
    descripcion: a.descripcion,
    responsableId: a.responsableId,
    fechaLimite: a.fechaLimite,
    estado: calcularEstadoEfectivo({ fechaLimite: a.fechaLimite, estado: a.estado }) as AccionCorrectiva["estado"],
    porcentajeAvance: a.porcentajeAvance,
    verificadoPorId: a.verificadoPorId ?? null,
    verificadoEn: a.verificadoEn ?? null,
    comentarioVerificacion: a.comentarioVerificacion ?? null,
    creadoEn: a.creadoEn,
    actualizadoEn: a.actualizadoEn,
    evidencias: (a.evidencias ?? []).map(mapEvidencia),
  };
}

const INCLUIR_ORIGEN = {
  evidencias: true,
  planCumplimiento: { include: { inspeccion: { include: { sucursal: true } } } },
} as const;

function mapAccionConOrigen(a: any): AccionCorrectivaConOrigen {
  return {
    ...mapAccion(a),
    inspeccionId: a.planCumplimiento.inspeccionId,
    sucursalId: a.planCumplimiento.inspeccion.sucursalId ?? null,
    clienteId: a.planCumplimiento.inspeccion.sucursal?.clienteId ?? null,
  };
}

export class AccionCorrectivaPrismaRepository implements AccionCorrectivaRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  /** Filtro de alcance por sucursal/cliente, trazando plan_cumplimiento → inspeccion → sucursal. */
  private whereAlcance(alcance?: AlcanceConsulta): Record<string, unknown> {
    if (!alcance || alcance.tipo === "TOTAL") return {};
    if (alcance.tipo === "CLIENTE") {
      return { planCumplimiento: { inspeccion: { sucursal: { clienteId: alcance.clienteId } } } };
    }
    return { planCumplimiento: { inspeccion: { sucursalId: { in: alcance.sucursalIds } } } };
  }

  async crear(datos: DatosCrearAccion): Promise<AccionCorrectivaConEvidencias> {
    const a = await this.prisma.accionCorrectiva.create({
      data: {
        planCumplimientoId: datos.planCumplimientoId,
        hallazgoId: datos.hallazgoId,
        descripcion: datos.descripcion,
        responsableId: datos.responsableId,
        fechaLimite: datos.fechaLimite,
      },
      include: { evidencias: true },
    });
    return mapAccion(a);
  }

  async obtenerPorId(id: string, empresaId: string): Promise<AccionCorrectivaConOrigen | null> {
    const a = await this.prisma.accionCorrectiva.findFirst({
      where: { id, planCumplimiento: { inspeccion: { empresaId } } },
      include: INCLUIR_ORIGEN,
    });
    return a ? mapAccionConOrigen(a) : null;
  }

  async actualizar(id: string, empresaId: string, datos: DatosActualizarAccion): Promise<AccionCorrectivaConEvidencias> {
    await this.prisma.accionCorrectiva.updateMany({
      where: { id, planCumplimiento: { inspeccion: { empresaId } } },
      data: datos,
    });
    return this.recargar(id);
  }

  async actualizarAvance(id: string, empresaId: string, porcentajeAvance: number): Promise<AccionCorrectivaConEvidencias> {
    await this.prisma.accionCorrectiva.updateMany({
      where: { id, planCumplimiento: { inspeccion: { empresaId } }, estado: "PENDIENTE" },
      data: { estado: "EN_PROCESO" },
    });
    await this.prisma.accionCorrectiva.updateMany({
      where: { id, planCumplimiento: { inspeccion: { empresaId } } },
      data: { porcentajeAvance },
    });
    return this.recargar(id);
  }

  async enviarARevision(id: string, empresaId: string): Promise<AccionCorrectivaConEvidencias> {
    await this.prisma.accionCorrectiva.updateMany({
      where: { id, planCumplimiento: { inspeccion: { empresaId } } },
      data: { estado: "EN_REVISION" },
    });
    return this.recargar(id);
  }

  async verificar(id: string, empresaId: string, datos: DatosVerificarAccion): Promise<AccionCorrectivaConEvidencias> {
    const nuevoEstado = datos.resultado === "CUMPLIDO" ? "CUMPLIDO" : "EN_PROCESO";
    await this.prisma.accionCorrectiva.updateMany({
      where: { id, planCumplimiento: { inspeccion: { empresaId } } },
      data: {
        estado: nuevoEstado,
        verificadoPorId: datos.verificadoPorId,
        verificadoEn: new Date(),
        comentarioVerificacion: datos.comentario,
        ...(datos.nuevaFechaLimite ? { fechaLimite: datos.nuevaFechaLimite } : {}),
      },
    });
    return this.recargar(id);
  }

  async listarPorPlan(planCumplimientoId: string, empresaId: string): Promise<AccionCorrectivaConEvidencias[]> {
    const filas = await this.prisma.accionCorrectiva.findMany({
      where: { planCumplimientoId, planCumplimiento: { inspeccion: { empresaId } } },
      include: { evidencias: true },
      orderBy: { creadoEn: "asc" },
    });
    return filas.map(mapAccion);
  }

  async listarPorResponsable(usuarioId: string, empresaId: string, alcance?: AlcanceConsulta): Promise<AccionCorrectivaConEvidencias[]> {
    const filas = await this.prisma.accionCorrectiva.findMany({
      where: { responsableId: usuarioId, planCumplimiento: { inspeccion: { empresaId } }, ...this.whereAlcance(alcance) },
      include: { evidencias: true },
      orderBy: { fechaLimite: "asc" },
    });
    return filas.map(mapAccion);
  }

  async listarEnRevision(empresaId: string, alcance?: AlcanceConsulta): Promise<AccionCorrectivaConEvidencias[]> {
    const filas = await this.prisma.accionCorrectiva.findMany({
      where: { estado: "EN_REVISION", planCumplimiento: { inspeccion: { empresaId } }, ...this.whereAlcance(alcance) },
      include: { evidencias: true },
      orderBy: { fechaLimite: "asc" },
    });
    return filas.map(mapAccion);
  }

  async agregarEvidencia(
    accionCorrectivaId: string,
    datos: { tipo: string; url: string; nombre: string; comentario?: string },
  ): Promise<AccionCorrectivaEvidenciaGuardada> {
    const e = await this.prisma.accionCorrectivaEvidencia.create({
      data: {
        accionCorrectivaId,
        tipo: datos.tipo,
        url: datos.url,
        nombre: datos.nombre,
        comentario: datos.comentario ?? null,
      },
    });
    return mapEvidencia(e);
  }

  private async recargar(id: string): Promise<AccionCorrectivaConEvidencias> {
    const a = await this.prisma.accionCorrectiva.findFirstOrThrow({ where: { id }, include: { evidencias: true } });
    return mapAccion(a);
  }
}
