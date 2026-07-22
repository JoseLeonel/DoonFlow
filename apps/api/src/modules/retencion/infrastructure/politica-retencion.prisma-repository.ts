import type { PrismaClient } from "@prisma/client";
import type { AccionAlVencer, PoliticaRetencion, TipoDatoRetencion } from "../domain/politica-retencion.entity";
import type { PoliticaRetencionRepositoryPort } from "../domain/politica-retencion.repository.port";

function mapear(raw: any): PoliticaRetencion {
  return {
    id: raw.id,
    empresaId: raw.empresaId,
    tipoDato: raw.tipoDato,
    mesesRetencion: raw.mesesRetencion,
    accionAlVencer: raw.accionAlVencer,
    actualizadoEn: raw.actualizadoEn,
  };
}

export class PoliticaRetencionPrismaRepository implements PoliticaRetencionRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerPorEmpresa(empresaId: string): Promise<PoliticaRetencion[]> {
    const rows = await this.prisma.politicaRetencion.findMany({ where: { empresaId }, orderBy: { tipoDato: "asc" } });
    return rows.map(mapear);
  }

  async actualizar(
    empresaId: string,
    tipoDato: TipoDatoRetencion,
    datos: { mesesRetencion: number; accionAlVencer: AccionAlVencer },
  ): Promise<PoliticaRetencion> {
    const row = await this.prisma.politicaRetencion.upsert({
      where: { empresaId_tipoDato: { empresaId, tipoDato } },
      update: datos,
      create: { empresaId, tipoDato, ...datos },
    });
    return mapear(row);
  }
}
