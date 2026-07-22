import type { PrismaClient } from "@prisma/client";
import type { AvisoPrivacidad, TipoEntidadPrivacidad } from "../domain/aviso-privacidad.entity";
import type { AvisoPrivacidadRepositoryPort, DatosRegistrarAvisoPrivacidad } from "../domain/aviso-privacidad.repository.port";

function mapear(raw: any): AvisoPrivacidad {
  return {
    id: raw.id,
    entidadTipo: raw.entidadTipo,
    entidadId: raw.entidadId,
    baseLegal: raw.baseLegal,
    registradoPorId: raw.registradoPorId,
    empresaId: raw.empresaId,
    creadoEn: raw.creadoEn,
  };
}

export class AvisoPrivacidadPrismaRepository implements AvisoPrivacidadRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async registrar(datos: DatosRegistrarAvisoPrivacidad): Promise<AvisoPrivacidad> {
    const row = await this.prisma.avisoPrivacidad.create({ data: datos });
    return mapear(row);
  }

  async listarPorEntidad(entidadTipo: TipoEntidadPrivacidad, entidadId: string): Promise<AvisoPrivacidad[]> {
    const rows = await this.prisma.avisoPrivacidad.findMany({
      where: { entidadTipo, entidadId },
      orderBy: { creadoEn: "desc" },
    });
    return rows.map(mapear);
  }
}
