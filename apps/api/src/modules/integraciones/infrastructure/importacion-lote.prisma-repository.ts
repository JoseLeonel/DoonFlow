import type { PrismaClient } from "@prisma/client";
import type { DatosImportacionLote, ImportacionLote, TipoImportacion } from "../domain/importacion-lote.entity";
import type { ImportacionLoteRepositoryPort } from "../domain/importacion-lote.repository.port";

function mapear(raw: any): ImportacionLote {
  return {
    id: raw.id,
    empresaId: raw.empresaId,
    tipo: raw.tipo,
    archivoNombre: raw.archivoNombre,
    totalFilas: raw.totalFilas,
    filasExitosas: raw.filasExitosas,
    filasConError: raw.filasConError,
    detalleErrores: (raw.detalleErrores as any) ?? null,
    creadoPorId: raw.creadoPorId,
    creadoEn: raw.creadoEn,
  };
}

export class ImportacionLotePrismaRepository implements ImportacionLoteRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(empresaId: string, creadoPorId: string, datos: DatosImportacionLote): Promise<ImportacionLote> {
    const row = await this.prisma.importacionLote.create({
      data: {
        empresaId,
        creadoPorId,
        tipo: datos.tipo,
        archivoNombre: datos.archivoNombre,
        totalFilas: datos.totalFilas,
        filasExitosas: datos.filasExitosas,
        filasConError: datos.filasConError,
        detalleErrores: (datos.detalleErrores ?? undefined) as any,
      },
    });
    return mapear(row);
  }

  async listar(empresaId: string, tipo?: TipoImportacion): Promise<ImportacionLote[]> {
    const rows = await this.prisma.importacionLote.findMany({
      where: { empresaId, ...(tipo ? { tipo } : {}) },
      orderBy: { creadoEn: "desc" },
    });
    return rows.map(mapear);
  }

  async obtenerPorId(id: string, empresaId: string): Promise<ImportacionLote | null> {
    const row = await this.prisma.importacionLote.findFirst({ where: { id, empresaId } });
    return row ? mapear(row) : null;
  }
}
