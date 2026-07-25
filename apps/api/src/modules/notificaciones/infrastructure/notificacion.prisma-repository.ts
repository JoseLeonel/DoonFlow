import type { PrismaClient } from "@prisma/client";
import type { Notificacion } from "../domain/notificacion.entity";
import type {
  DatosCrearNotificacion,
  FiltrosListarNotificaciones,
  NotificacionRepositoryPort,
} from "../domain/notificacion.repository.port";

function mapNotificacion(n: any): Notificacion {
  return {
    id: n.id,
    usuarioId: n.usuarioId,
    tipo: n.tipo,
    referenciaTipo: n.referenciaTipo,
    referenciaId: n.referenciaId,
    mensaje: n.mensaje,
    leidaEn: n.leidaEn ?? null,
    enviadaPorCorreo: n.enviadaPorCorreo,
    creadoEn: n.creadoEn,
    empresaId: n.empresaId,
  };
}

export class NotificacionPrismaRepository implements NotificacionRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async listarPorUsuario(usuarioId: string, empresaId: string, filtros: FiltrosListarNotificaciones): Promise<Notificacion[]> {
    const filas = await this.prisma.notificacion.findMany({
      where: { usuarioId, empresaId, ...(filtros.soloNoLeidas ? { leidaEn: null } : {}) },
      orderBy: { creadoEn: "desc" },
      take: 50,
    });
    return filas.map(mapNotificacion);
  }

  contarNoLeidas(usuarioId: string, empresaId: string): Promise<number> {
    return this.prisma.notificacion.count({ where: { usuarioId, empresaId, leidaEn: null } });
  }

  async marcarLeida(id: string, usuarioId: string): Promise<Notificacion | null> {
    const existente = await this.prisma.notificacion.findFirst({ where: { id, usuarioId } });
    if (!existente) return null;
    const actualizada = await this.prisma.notificacion.update({ where: { id }, data: { leidaEn: new Date() } });
    return mapNotificacion(actualizada);
  }

  async marcarTodasLeidas(usuarioId: string, empresaId: string): Promise<number> {
    const { count } = await this.prisma.notificacion.updateMany({
      where: { usuarioId, empresaId, leidaEn: null },
      data: { leidaEn: new Date() },
    });
    return count;
  }

  async crear(datos: DatosCrearNotificacion): Promise<Notificacion> {
    const n = await this.prisma.notificacion.create({
      data: {
        usuarioId: datos.usuarioId,
        empresaId: datos.empresaId,
        tipo: datos.tipo,
        referenciaTipo: datos.referenciaTipo,
        referenciaId: datos.referenciaId,
        mensaje: datos.mensaje,
      },
    });
    return mapNotificacion(n);
  }

  async buscarAdministradoresCliente(clienteId: string, empresaId: string): Promise<string[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { empresaId, clienteId, activo: true, rol: { nombre: "administrador_cliente" } },
      select: { id: true },
    });
    return usuarios.map((u) => u.id);
  }

  async buscarAdministradoresGenerales(empresaId: string): Promise<string[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { empresaId, activo: true, rol: { nombre: "administrador" } },
      select: { id: true },
    });
    return usuarios.map((u) => u.id);
  }

  async generarVencimientos(): Promise<number> {
    const filas = await this.prisma.$queryRaw<{ total: number }[]>`
      SELECT sp_notificacion_generar_vencimientos() AS total
    `;
    return Number(filas[0]?.total ?? 0);
  }

  async escalarAccionesVencidas(): Promise<number> {
    const filas = await this.prisma.$queryRaw<{ total: number }[]>`
      SELECT sp_accion_correctiva_escalar() AS total
    `;
    return Number(filas[0]?.total ?? 0);
  }
}
