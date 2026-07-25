import type { PrismaClient } from "@prisma/client";
import type { CertificadoPublicoCrudo, VerificacionRepositoryPort } from "../domain/verificacion.repository.port";

export class VerificacionPrismaRepository implements VerificacionRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerPorCodigo(codigoVerificacion: string): Promise<CertificadoPublicoCrudo | null> {
    const i = await this.prisma.inspeccion.findFirst({
      where: { codigoVerificacion, estado: "FIRMADA" },
      select: {
        firmadoEn: true,
        fechaVencimiento: true,
        sucursal: { select: { nombre: true, cliente: { select: { empresa: true } } } },
        plantilla: { select: { nombre: true } },
      },
    });
    if (!i || !i.firmadoEn || !i.fechaVencimiento || !i.sucursal) return null;

    return {
      cliente: i.sucursal.cliente.empresa,
      sucursal: i.sucursal.nombre,
      fechaEmision: i.firmadoEn,
      fechaVencimiento: i.fechaVencimiento,
      nombrePlantilla: i.plantilla.nombre,
    };
  }
}
