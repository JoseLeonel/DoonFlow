export interface CredencialesLogin {
  email: string;
  password: string;
}

export interface ResultadoLogin {
  ok: boolean;
  mensajeError?: string;
}

/**
 * Capa de datos: única que llama a la API de DoonFlow para autenticar.
 * Delega a /api/auth (Route Handler de Next.js) que setea la cookie httpOnly.
 */
export async function iniciarSesion({
  email,
  password,
}: CredencialesLogin): Promise<ResultadoLogin> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (res.ok) return { ok: true };

  const data = await res.json().catch(() => ({}));
  const mensaje =
    data?.error?.mensaje ?? "Email o contraseña incorrectos.";

  return { ok: false, mensajeError: mensaje };
}
