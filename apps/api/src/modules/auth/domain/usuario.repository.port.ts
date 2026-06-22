import type { UsuarioConRol } from "./usuario.entity";

/** Puerto (interfaz) — implementado en infrastructure/usuario.prisma-repository.ts. */
export interface UsuarioRepositoryPort {
  buscarPorAuthUserId(authUserId: string): Promise<UsuarioConRol | null>;
}
