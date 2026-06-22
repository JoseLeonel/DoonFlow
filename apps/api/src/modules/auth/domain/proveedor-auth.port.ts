/** Puerto hacia el proveedor de autenticación (Supabase Auth en infrastructure/supabase-auth.adapter.ts). */
export interface ProveedorAuthPort {
  verificarCredenciales(
    email: string,
    password: string,
  ): Promise<{ authUserId: string; tokenAcceso: string } | null>;
}
