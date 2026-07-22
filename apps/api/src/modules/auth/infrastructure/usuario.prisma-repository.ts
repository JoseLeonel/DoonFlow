import type { PrismaClient } from "@prisma/client";
import type { UsuarioConRol } from "../domain/usuario.entity";
import type {
  DatosActualizarUsuario,
  DatosCrearUsuario,
  UsuarioDetalle,
  UsuarioRepositoryPort,
} from "../domain/usuario.repository.port";

const INCLUDE_DETALLE = {
  rol: true,
  cliente: true,
  sucursalPrincipal: true,
  accesosSucursal: { include: { sucursal: true } },
} as const;

function mapearDetalle(usuario: any): UsuarioDetalle {
  return {
    id:             usuario.id,
    empresaId:      usuario.empresaId,
    email:          usuario.email,
    nombre:         usuario.nombre,
    rolId:          usuario.rolId,
    rolNombre:      usuario.rol.nombre as UsuarioDetalle["rolNombre"],
    clienteId:      usuario.clienteId ?? null,
    clienteNombre:  usuario.cliente?.empresa ?? null,
    sucursalId:     usuario.sucursalId ?? null,
    sucursalNombre: usuario.sucursalPrincipal?.nombre ?? null,
    sucursalesAdicionales: (usuario.accesosSucursal ?? []).map((a: any) => ({ id: a.sucursal.id, nombre: a.sucursal.nombre })),
    activo:         usuario.activo,
    creadoEn:       usuario.creadoEn,
    actualizadoEn:  usuario.actualizadoEn,
  };
}

/** Adaptador: implementa el puerto del repositorio con Prisma. */
export class UsuarioPrismaRepository implements UsuarioRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorAuthUserId(authUserId: string): Promise<UsuarioConRol | null> {
    // Busca por authUserId (modo Supabase) O por id (modo local — LocalAuthAdapter pasa usuario.id).
    const usuario = await this.prisma.usuario.findFirst({
      where: { OR: [{ authUserId }, { id: authUserId }] },
      include: { rol: true },
    });

    if (!usuario) return null;

    return {
      id:          usuario.id,
      empresaId:   usuario.empresaId,
      authUserId:  usuario.authUserId ?? usuario.id,
      email:       usuario.email,
      nombre:      usuario.nombre,
      rol:         usuario.rol.nombre as UsuarioConRol["rol"],
      activo:      usuario.activo,
      clienteId:   usuario.clienteId ?? null,
      sucursalId:  usuario.sucursalId ?? null,
    };
  }

  async listar(empresaId: string): Promise<UsuarioDetalle[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { empresaId },
      include: INCLUDE_DETALLE,
      orderBy: { nombre: "asc" },
    });
    return usuarios.map(mapearDetalle);
  }

  async obtenerPorId(id: string, empresaId: string): Promise<UsuarioDetalle | null> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, empresaId },
      include: INCLUDE_DETALLE,
    });
    return usuario ? mapearDetalle(usuario) : null;
  }

  async buscarPorEmail(email: string, empresaId: string): Promise<UsuarioConRol | null> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { email, empresaId },
      include: { rol: true },
    });
    if (!usuario) return null;
    return {
      id:          usuario.id,
      empresaId:   usuario.empresaId,
      authUserId:  usuario.authUserId ?? usuario.id,
      email:       usuario.email,
      nombre:      usuario.nombre,
      rol:         usuario.rol.nombre as UsuarioConRol["rol"],
      activo:      usuario.activo,
      clienteId:   usuario.clienteId ?? null,
      sucursalId:  usuario.sucursalId ?? null,
    };
  }

  async crear(datos: DatosCrearUsuario, sucursalesAdicionalesIds: string[]): Promise<UsuarioDetalle> {
    const usuario = await this.prisma.usuario.create({
      data: {
        empresaId:    datos.empresaId,
        nombre:       datos.nombre,
        email:        datos.email,
        passwordHash: datos.passwordHash ?? null,
        rolId:        datos.rolId,
        clienteId:    datos.clienteId ?? null,
        sucursalId:   datos.sucursalId ?? null,
        accesosSucursal: sucursalesAdicionalesIds.length
          ? { createMany: { data: sucursalesAdicionalesIds.map((sucursalId) => ({ sucursalId })) } }
          : undefined,
      },
      include: INCLUDE_DETALLE,
    });
    return mapearDetalle(usuario);
  }

  async actualizar(
    id: string,
    empresaId: string,
    datos: DatosActualizarUsuario,
    sucursalesAdicionalesIds?: string[],
  ): Promise<UsuarioDetalle> {
    await this.prisma.$transaction([
      this.prisma.usuario.updateMany({
        where: { id, empresaId },
        data: {
          nombre:     datos.nombre,
          email:      datos.email,
          rolId:      datos.rolId,
          clienteId:  datos.clienteId,
          sucursalId: datos.sucursalId,
        },
      }),
      ...(sucursalesAdicionalesIds !== undefined
        ? [
            this.prisma.usuarioSucursalAcceso.deleteMany({ where: { usuarioId: id } }),
            this.prisma.usuarioSucursalAcceso.createMany({
              data: sucursalesAdicionalesIds.map((sucursalId) => ({ usuarioId: id, sucursalId })),
            }),
          ]
        : []),
    ]);
    return this.obtenerPorId(id, empresaId) as Promise<UsuarioDetalle>;
  }

  async cambiarEstado(id: string, empresaId: string, activo: boolean): Promise<UsuarioDetalle> {
    await this.prisma.usuario.updateMany({ where: { id, empresaId }, data: { activo } });
    return this.obtenerPorId(id, empresaId) as Promise<UsuarioDetalle>;
  }

  async obtenerSucursalesAdicionales(usuarioId: string): Promise<string[]> {
    const accesos = await this.prisma.usuarioSucursalAcceso.findMany({ where: { usuarioId } });
    return accesos.map((a) => a.sucursalId);
  }

  async reemplazarSucursalesAdicionales(usuarioId: string, sucursalIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.usuarioSucursalAcceso.deleteMany({ where: { usuarioId } }),
      this.prisma.usuarioSucursalAcceso.createMany({ data: sucursalIds.map((sucursalId) => ({ usuarioId, sucursalId })) }),
    ]);
  }

  async obtenerPasswordHash(id: string, empresaId: string): Promise<string | null> {
    const usuario = await this.prisma.usuario.findFirst({ where: { id, empresaId }, select: { passwordHash: true } });
    return usuario?.passwordHash ?? null;
  }

  async actualizarPasswordHash(id: string, empresaId: string, passwordHash: string): Promise<void> {
    await this.prisma.usuario.updateMany({ where: { id, empresaId }, data: { passwordHash } });
  }
}
