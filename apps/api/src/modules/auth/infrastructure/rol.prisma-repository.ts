import type { PrismaClient } from "@prisma/client";
import type { RolSistema } from "@doonflow/shared";
import type { RolRepositoryPort } from "../domain/rol.repository.port";

export class RolPrismaRepository implements RolRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerPorId(id: string): Promise<{ id: string; nombre: RolSistema } | null> {
    const rol = await this.prisma.rol.findUnique({ where: { id } });
    if (!rol) return null;
    return { id: rol.id, nombre: rol.nombre as RolSistema };
  }

  async listar(): Promise<{ id: string; nombre: RolSistema }[]> {
    const roles = await this.prisma.rol.findMany({ orderBy: { nombre: "asc" } });
    return roles.map((r) => ({ id: r.id, nombre: r.nombre as RolSistema }));
  }
}
