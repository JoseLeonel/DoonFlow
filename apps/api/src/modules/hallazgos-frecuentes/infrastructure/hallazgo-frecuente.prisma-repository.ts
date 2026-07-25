import type { PrismaClient } from "@prisma/client";
import type { HallazgoFrecuente } from "../domain/hallazgo-frecuente.entity";
import type {
  DatosActualizarHallazgoFrecuente,
  DatosCrearHallazgoFrecuente,
  FiltrosHallazgoFrecuente,
  HallazgoFrecuenteRepositoryPort,
} from "../domain/hallazgo-frecuente.repository.port";

function mapHallazgoFrecuente(h: any): HallazgoFrecuente {
  return {
    id: h.id,
    descripcionHallazgo: h.descripcionHallazgo,
    severidadSugerida: h.severidadSugerida,
    descripcionAccionSugerida: h.descripcionAccionSugerida ?? null,
    activo: h.activo,
    empresaId: h.empresaId,
    creadoEn: h.creadoEn,
    actualizadoEn: h.actualizadoEn,
  };
}

export class HallazgoFrecuentePrismaRepository implements HallazgoFrecuenteRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async listar(empresaId: string, filtros: FiltrosHallazgoFrecuente): Promise<HallazgoFrecuente[]> {
    const filas = await this.prisma.hallazgoFrecuente.findMany({
      where: { empresaId, ...(filtros.soloActivos ? { activo: true } : {}) },
      orderBy: { descripcionHallazgo: "asc" },
    });
    return filas.map(mapHallazgoFrecuente);
  }

  async obtenerPorId(id: string, empresaId: string): Promise<HallazgoFrecuente | null> {
    const h = await this.prisma.hallazgoFrecuente.findFirst({ where: { id, empresaId } });
    return h ? mapHallazgoFrecuente(h) : null;
  }

  async crear(datos: DatosCrearHallazgoFrecuente): Promise<HallazgoFrecuente> {
    const h = await this.prisma.hallazgoFrecuente.create({
      data: {
        empresaId: datos.empresaId,
        descripcionHallazgo: datos.descripcionHallazgo,
        severidadSugerida: datos.severidadSugerida,
        descripcionAccionSugerida: datos.descripcionAccionSugerida ?? null,
      },
    });
    return mapHallazgoFrecuente(h);
  }

  async actualizar(id: string, empresaId: string, datos: DatosActualizarHallazgoFrecuente): Promise<HallazgoFrecuente> {
    await this.prisma.hallazgoFrecuente.updateMany({ where: { id, empresaId }, data: datos });
    const h = await this.prisma.hallazgoFrecuente.findFirstOrThrow({ where: { id, empresaId } });
    return mapHallazgoFrecuente(h);
  }

  async cambiarEstado(id: string, empresaId: string, activo: boolean): Promise<HallazgoFrecuente> {
    await this.prisma.hallazgoFrecuente.updateMany({ where: { id, empresaId }, data: { activo } });
    const h = await this.prisma.hallazgoFrecuente.findFirstOrThrow({ where: { id, empresaId } });
    return mapHallazgoFrecuente(h);
  }
}
