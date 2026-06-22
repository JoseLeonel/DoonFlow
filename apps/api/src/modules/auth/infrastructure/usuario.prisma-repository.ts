import type { PrismaClient } from "@prisma/client";
import type { UsuarioConRol } from "../domain/usuario.entity";
import type { UsuarioRepositoryPort } from "../domain/usuario.repository.port";

/** Adaptador: implementa el puerto del repositorio con Prisma. */
export class UsuarioPrismaRepository implements UsuarioRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorAuthUserId(authUserId: string): Promise<UsuarioConRol | null> {
    // Busca por authUserId (modo Supabase) O por id (modo local — LocalAuthAdapter pasa usuario.id).
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ authUserId }, { id: authUserId }],
      },
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
    };
  }
}
