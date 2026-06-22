import type { PrismaClient } from "@prisma/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IniciarSesionUseCase } from "./application/casos-uso/iniciar-sesion.usecase";
import { AuthController } from "./infrastructure/auth.controller";
import { crearAuthRouter } from "./infrastructure/auth.router";
import { LocalAuthAdapter } from "./infrastructure/local-auth.adapter";
import { SupabaseAuthAdapter } from "./infrastructure/supabase-auth.adapter";
import { UsuarioPrismaRepository } from "./infrastructure/usuario.prisma-repository";

/**
 * Composición del módulo auth.
 * Si JWT_SECRET está definido y NEXT_PUBLIC_SUPABASE_URL está vacío o es placeholder,
 * usa LocalAuthAdapter (desarrollo local sin Supabase).
 * Si NEXT_PUBLIC_SUPABASE_URL apunta a Supabase real, usa SupabaseAuthAdapter.
 */
export function crearModuloAuth(
  prisma: PrismaClient,
  supabase: SupabaseClient | null,
) {
  const usuarioRepository = new UsuarioPrismaRepository(prisma);

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

  const iniciarSesionUseCase = new IniciarSesionUseCase(proveedorAuth, usuarioRepository);
  const controller = new AuthController(iniciarSesionUseCase);

  return { router: crearAuthRouter(controller) };
}
