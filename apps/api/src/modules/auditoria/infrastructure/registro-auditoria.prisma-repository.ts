import type { PrismaClient } from "@prisma/client";
import type { RegistroAuditoria, DatosRegistrarAuditoria, FiltrosAuditoria } from "../domain/registro-auditoria.entity";
import type { RegistroAuditoriaRepositoryPort } from "../domain/registro-auditoria.repository.port";

function mapear(raw: any): RegistroAuditoria {
  return {
    id: raw.id,
    empresaId: raw.empresaId,
    usuarioId: raw.usuarioId,
    accion: raw.accion,
    entidadTipo: raw.entidadTipo,
    entidadId: raw.entidadId,
    valorAntes: raw.valorAntes ?? null,
    valorDespues: raw.valorDespues ?? null,
    ip: raw.ip ?? null,
    creadoEn: raw.creadoEn,
  };
}

/** Nunca expone `update`/`delete` de Prisma para esta tabla — solo `create` y `findMany` (append-only). */
export class RegistroAuditoriaPrismaRepository implements RegistroAuditoriaRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async registrar(datos: DatosRegistrarAuditoria): Promise<RegistroAuditoria> {
    const row = await this.prisma.registroAuditoria.create({
      data: {
        empresaId: datos.empresaId,
        usuarioId: datos.usuarioId,
        accion: datos.accion,
        entidadTipo: datos.entidadTipo,
        entidadId: datos.entidadId,
        valorAntes: datos.valorAntes ?? undefined,
        valorDespues: datos.valorDespues ?? undefined,
        ip: datos.ip ?? undefined,
      },
    });
    return mapear(row);
  }

  async listar(
    empresaId: string,
    filtros: FiltrosAuditoria,
    paginacion: { pagina: number; porPagina: number },
  ): Promise<{ items: RegistroAuditoria[]; total: number }> {
    const where = {
      empresaId,
      ...(filtros.usuarioId ? { usuarioId: filtros.usuarioId } : {}),
      ...(filtros.accion ? { accion: filtros.accion } : {}),
      ...(filtros.desde || filtros.hasta
        ? { creadoEn: { ...(filtros.desde ? { gte: filtros.desde } : {}), ...(filtros.hasta ? { lte: filtros.hasta } : {}) } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.registroAuditoria.findMany({
        where,
        orderBy: { creadoEn: "desc" },
        skip: (paginacion.pagina - 1) * paginacion.porPagina,
        take: paginacion.porPagina,
      }),
      this.prisma.registroAuditoria.count({ where }),
    ]);

    return { items: rows.map(mapear), total };
  }
}
