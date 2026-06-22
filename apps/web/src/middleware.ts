import { NextResponse, type NextRequest } from "next/server";

const COOKIE_TOKEN = "doonflow_token";
const RUTAS_PUBLICAS = ["/auth/login", "/auth/registro", "/api/auth"];

/** Guard de rutas: sin cookie de sesión, redirige a /auth/login. Dueño: agente-auth. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Las rutas de auth y API no requieren sesión
  const esPublica = RUTAS_PUBLICAS.some((r) => pathname.startsWith(r));
  if (esPublica) return NextResponse.next();

  // Verificar cookie de sesión
  const token = request.cookies.get(COOKIE_TOKEN)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
