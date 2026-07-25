import type { PrismaClient } from "@prisma/client";
import type { ApiKey } from "../domain/api-key.entity";
import type { ApiKeyRepositoryPort, DatosCrearApiKey } from "../domain/api-key.repository.port";

function mapear(raw: any): ApiKey {
  return {
    id: raw.id,
    empresaId: raw.empresaId,
    nombre: raw.nombre,
    claveHash: raw.claveHash,
    activa: raw.activa,
    ultimoUsoEn: raw.ultimoUsoEn ?? null,
    creadoPorId: raw.creadoPorId,
    creadoEn: raw.creadoEn,
  };
}

export class ApiKeyPrismaRepository implements ApiKeyRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async listar(empresaId: string): Promise<ApiKey[]> {
    const rows = await this.prisma.apiKey.findMany({ where: { empresaId }, orderBy: { creadoEn: "desc" } });
    return rows.map(mapear);
  }

  async obtenerPorId(id: string, empresaId: string): Promise<ApiKey | null> {
    const row = await this.prisma.apiKey.findFirst({ where: { id, empresaId } });
    return row ? mapear(row) : null;
  }

  async crear(datos: DatosCrearApiKey): Promise<ApiKey> {
    const row = await this.prisma.apiKey.create({
      data: {
        empresaId: datos.empresaId,
        nombre: datos.nombre,
        claveHash: datos.claveHash,
        creadoPorId: datos.creadoPorId,
      },
    });
    return mapear(row);
  }

  async revocar(id: string, empresaId: string): Promise<ApiKey> {
    await this.prisma.apiKey.updateMany({ where: { id, empresaId }, data: { activa: false } });
    const row = await this.prisma.apiKey.findFirstOrThrow({ where: { id, empresaId } });
    return mapear(row);
  }

  async obtenerActivaPorHash(claveHash: string): Promise<ApiKey | null> {
    const row = await this.prisma.apiKey.findFirst({ where: { claveHash, activa: true } });
    return row ? mapear(row) : null;
  }

  async marcarUso(id: string, fecha: Date): Promise<void> {
    await this.prisma.apiKey.update({ where: { id }, data: { ultimoUsoEn: fecha } });
  }
}
