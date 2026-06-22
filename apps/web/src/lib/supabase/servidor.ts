import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

interface CookieParaSetear {
  name: string;
  value: string;
  options: CookieOptions;
}

/** Cliente de Supabase para Server Components / Route Handlers (lee/escribe cookies de sesión). */
export async function crearClienteSupabaseServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesParaSetear: CookieParaSetear[]) => {
          cookiesParaSetear.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}
