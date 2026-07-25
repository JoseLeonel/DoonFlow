import type { PrismaClient } from "@prisma/client";
import type { Hallazgo } from "../domain/hallazgo.entity";
import type {
  DatosActualizarHallazgo,
  DatosCrearHallazgo,
  HallazgoConEvidencias,
  HallazgoEvidenciaGuardada,
  HallazgoRepositoryPort,
} from "../domain/hallazgo.repository.port";

function mapEvidencia(e: any): HallazgoEvidenciaGuardada {
  return {
    id: e.id,
    hallazgoId: e.hallazgoId,
    tipo: e.tipo,
    url: e.url,
    nombre: e.nombre,
    tamanoBytes: e.tamanoBytes ?? null,
    creadoEn: e.creadoEn,
  };
}

function mapHallazgo(h: any): HallazgoConEvidencias {
  return {
    id: h.id,
    inspeccionId: h.inspeccionId,
    detalleId: h.detalleId ?? null,
    descripcion: h.descripcion,
    categoria: h.categoria as Hallazgo["categoria"],
    severidad: (h.severidad ?? null) as Hallazgo["severidad"],
    estado: h.estado as Hallazgo["estado"],
    creadoEn: h.creadoEn,
    evidencias: (h.evidencias ?? []).map(mapEvidencia),
  };
}

export class HallazgoPrismaRepository implements HallazgoRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async listarPorInspeccion(inspeccionId: string, empresaId: string): Promise<HallazgoConEvidencias[]> {
    const filas = await this.prisma.hallazgo.findMany({
      where: { inspeccionId, empresaId },
      include: { evidencias: true },
      orderBy: { creadoEn: "asc" },
    });
    return filas.map(mapHallazgo);
  }

  async listarDetalleIdsConHallazgo(inspeccionId: string): Promise<Set<string>> {
    const filas = await this.prisma.hallazgo.findMany({
      where: { inspeccionId, categoria: "NO_CONFORMIDAD", detalleId: { not: null } },
      select: { detalleId: true },
    });
    return new Set(filas.map((f) => f.detalleId!));
  }

  async listarClavesComentarioConHallazgo(inspeccionId: string): Promise<Set<string>> {
    const filas = await this.prisma.hallazgo.findMany({
      where: {
        inspeccionId,
        categoria: { in: ["RECONOCIMIENTO", "OBSERVACION", "OPORTUNIDAD_MEJORA"] },
        detalleId: { not: null },
      },
      select: { detalleId: true, categoria: true },
    });
    return new Set(filas.map((f) => `${f.detalleId}::${f.categoria}`));
  }

  async crear(datos: DatosCrearHallazgo): Promise<HallazgoConEvidencias> {
    const h = await this.prisma.hallazgo.create({
      data: {
        inspeccionId: datos.inspeccionId,
        empresaId: datos.empresaId,
        descripcion: datos.descripcion,
        categoria: datos.categoria,
        severidad: datos.severidad ?? null,
        detalleId: datos.detalleId ?? null,
      },
      include: { evidencias: true },
    });
    return mapHallazgo(h);
  }

  async crearVarios(datos: DatosCrearHallazgo[]): Promise<HallazgoConEvidencias[]> {
    return this.prisma.$transaction((tx) =>
      Promise.all(
        datos.map((d) =>
          tx.hallazgo.create({
            data: {
              inspeccionId: d.inspeccionId,
              empresaId: d.empresaId,
              descripcion: d.descripcion,
              categoria: d.categoria,
              severidad: d.severidad ?? null,
              detalleId: d.detalleId ?? null,
            },
            include: { evidencias: true },
          }),
        ),
      ),
    ).then((filas) => filas.map(mapHallazgo));
  }

  async obtenerPorId(id: string, empresaId: string): Promise<HallazgoConEvidencias | null> {
    const h = await this.prisma.hallazgo.findFirst({ where: { id, empresaId }, include: { evidencias: true } });
    return h ? mapHallazgo(h) : null;
  }

  async actualizar(id: string, empresaId: string, datos: DatosActualizarHallazgo): Promise<HallazgoConEvidencias> {
    await this.prisma.hallazgo.updateMany({ where: { id, empresaId }, data: datos });
    const h = await this.prisma.hallazgo.findFirstOrThrow({ where: { id, empresaId }, include: { evidencias: true } });
    return mapHallazgo(h);
  }

  async anularPorApelacion(id: string, empresaId: string): Promise<HallazgoConEvidencias> {
    await this.prisma.hallazgo.updateMany({ where: { id, empresaId }, data: { estado: "ANULADO_POR_APELACION" } });
    const h = await this.prisma.hallazgo.findFirstOrThrow({ where: { id, empresaId }, include: { evidencias: true } });
    return mapHallazgo(h);
  }

  async agregarEvidencia(
    hallazgoId: string,
    datos: { tipo: string; url: string; nombre: string; tamanoBytes?: number },
  ): Promise<HallazgoEvidenciaGuardada> {
    const e = await this.prisma.hallazgoEvidencia.create({
      data: { hallazgoId, tipo: datos.tipo, url: datos.url, nombre: datos.nombre, tamanoBytes: datos.tamanoBytes ?? null },
    });
    return mapEvidencia(e);
  }
}
