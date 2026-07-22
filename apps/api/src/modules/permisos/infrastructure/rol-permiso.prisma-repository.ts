import type { PrismaClient } from "@prisma/client";
import type { MatrizCruda, RolPermisoRepositoryPort } from "../domain/rol-permiso.repository.port";
import type { Permiso, Rol } from "../domain/rol-permiso.entity";

function mapRol(r: { id: string; nombre: string; descripcion: string | null }): Rol {
  return { id: r.id, nombre: r.nombre, descripcion: r.descripcion ?? undefined };
}

function mapPermiso(p: { id: string; codigo: string; descripcion: string | null }): Permiso {
  return { id: p.id, codigo: p.codigo, descripcion: p.descripcion ?? undefined };
}

export class RolPermisoPrismaRepository implements RolPermisoRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerMatriz(): Promise<MatrizCruda> {
    const [roles, permisos, asignaciones] = await Promise.all([
      this.prisma.rol.findMany({ orderBy: { nombre: "asc" } }),
      this.prisma.permiso.findMany({ orderBy: { codigo: "asc" } }),
      this.prisma.rolPermiso.findMany(),
    ]);
    return {
      roles: roles.map(mapRol),
      permisos: permisos.map(mapPermiso),
      asignaciones: asignaciones.map((a) => ({ rolId: a.rolId, permisoId: a.permisoId })),
    };
  }

  async obtenerRolPorId(rolId: string): Promise<Rol | null> {
    const rol = await this.prisma.rol.findUnique({ where: { id: rolId } });
    return rol ? mapRol(rol) : null;
  }

  async listarPermisosPorIds(permisoIds: string[]): Promise<Permiso[]> {
    const permisos = await this.prisma.permiso.findMany({ where: { id: { in: permisoIds } } });
    return permisos.map(mapPermiso);
  }

  async asignarPermisos(rolId: string, permisoIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.rolPermiso.deleteMany({ where: { rolId } }),
      this.prisma.rolPermiso.createMany({ data: permisoIds.map((permisoId) => ({ rolId, permisoId })) }),
    ]);
  }

  async listarCodigosPermisoDelRol(rolNombre: string): Promise<string[]> {
    const rol = await this.prisma.rol.findUnique({
      where: { nombre: rolNombre },
      include: { rolPermisos: { include: { permiso: true } } },
    });
    return rol?.rolPermisos.map((rp) => rp.permiso.codigo) ?? [];
  }
}
