import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProveedorAuthPort } from "../domain/proveedor-auth.port";

/** Adaptador: implementa el puerto de autenticación contra Supabase Auth. */
export class SupabaseAuthAdapter implements ProveedorAuthPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async verificarCredenciales(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      return null;
    }

    return {
      authUserId: data.user.id,
      tokenAcceso: data.session.access_token,
    };
  }
}
