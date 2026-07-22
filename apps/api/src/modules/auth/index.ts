import type { PrismaClient } from "@prisma/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestHandler } from "express";
import { IniciarSesionUseCase } from "./application/casos-uso/iniciar-sesion.usecase";
import { GestionarUsuarioUseCase } from "./application/casos-uso/gestionar-usuario.usecase";
import { AuthController } from "./infrastructure/auth.controller";
import { UsuarioController } from "./infrastructure/usuario.controller";
import { crearAuthRouter } from "./infrastructure/auth.router";
import { crearUsuariosRouter } from "./infrastructure/usuarios.router";
import { LocalAuthAdapter } from "./infrastructure/local-auth.adapter";
import { SupabaseAuthAdapter } from "./infrastructure/supabase-auth.adapter";
import { UsuarioPrismaRepository } from "./infrastructure/usuario.prisma-repository";
import { RolPrismaRepository } from "./infrastructure/rol.prisma-repository";
import type { RegistradorEventoAuditoria } from "../../shared/auditoria/registrar-evento-auditoria";

/**
 * Composición del módulo auth.
 * Si JWT_SECRET está definido y NEXT_PUBLIC_SUPABASE_URL está vacío o es placeholder,
 * usa LocalAuthAdapter (desarrollo local sin Supabase).
 * Si NEXT_PUBLIC_SUPABASE_URL apunta a Supabase real, usa SupabaseAuthAdapter.
 */
export function crearModuloAuth(
  prisma: PrismaClient,
  supabase: SupabaseClient | null,
  autenticar: RequestHandler,
  registrarEventoAuditoria?: RegistradorEventoAuditoria,
) {
  const usuarioRepository = new UsuarioPrismaRepository(prisma);
  const rolRepository = new RolPrismaRepository(prisma);

  const esLocal =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  const proveedorAuth = esLocal
    ? new LocalAuthAdapter(
        prisma,
        process.env.JWT_SECRET ?? "dev-secret-inseguro",
        process.env.JWT_EXPIRES_IN ?? "8h",
      )
    : new SupabaseAuthAdapter(supabase!);

  if (esLocal) {
    console.log("[auth] Modo LOCAL — bcrypt + JWT propio (sin Supabase)");
  } else {
    console.log("[auth] Modo SUPABASE");
  }

  const iniciarSesionUseCase = new IniciarSesionUseCase(proveedorAuth, usuarioRepository, registrarEventoAuditoria);
  const gestionarUsuarioUseCase = new GestionarUsuarioUseCase(usuarioRepository, rolRepository, registrarEventoAuditoria);

  const authController = new AuthController(iniciarSesionUseCase, usuarioRepository);
  const usuarioController = new UsuarioController(gestionarUsuarioUseCase);

  return {
    router: crearAuthRouter(authController, autenticar),
    routerUsuarios: crearUsuariosRouter(usuarioController, autenticar),
  };
}
