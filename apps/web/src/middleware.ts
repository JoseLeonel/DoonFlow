import { NextResponse, type NextRequest } from "next/server";

const COOKIE_TOKEN = "doonflow_token";
const RUTAS_PUBLICAS = ["/auth/login", "/auth/registro", "/api/auth", "/verificar", "/api/verificacion"];

/**
 * Decodifica el payload del JWT sin verificar la firma — solo para UX de enrutamiento.
 * La verificación real (firma + expiración) ocurre en el backend en cada request
 * (`autenticacion.middleware.ts` → `401 { codigo: "sesion_expirada" }` cuando `exp` venció).
 * jsonwebtoken no corre en el Edge Runtime de Next.js (usa APIs de Node no disponibles aquí).
 */
function decodificarPayload(token: string): { rol?: string; exp?: number } | null {
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return null;
    const json = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as { rol?: string; exp?: number };
  } catch {
    return null;
  }
}

const GUARDS_POR_RUTA: { prefijo: string; rolesPermitidos: string[] }[] = [
  { prefijo: "/mantenimientos/usuarios", rolesPermitidos: ["administrador"] },
  // 009-integraciones-datos-masivos, HU-3 — solo administrador gestiona API keys (mismo criterio que el backend, ver api-keys.router.ts).
  { prefijo: "/configuracion/integraciones", rolesPermitidos: ["administrador"] },
  { prefijo: "/mi-empresa", rolesPermitidos: ["administrador_cliente"] },
  { prefijo: "/mi-sucursal", rolesPermitidos: ["usuario_sucursal"] },
  // 013-hallazgos-plan-cumplimiento — regla 4: solo auditor/administrador verifican acciones.
  { prefijo: "/certificaciones/verificacion", rolesPermitidos: ["administrador", "auditor"] },
  // 011-aceptacion-apelaciones-certificacion — resolver apelaciones requiere el permiso
  // granular `apelaciones.resolver` (ver matriz de /mantenimientos/roles); como guard de UX
  // aquí se restringe a los roles que típicamente lo tienen (administrador ya pasa siempre,
  // auditor es a quien se le asigna por defecto) — la verificación real ocurre en el backend.
  { prefijo: "/apelaciones", rolesPermitidos: ["administrador", "auditor"] },
];

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

  const payload = decodificarPayload(token);

  // 010-seguridad-privacidad-continuidad (HU-1): sesión expirada → reautenticar, sin
  // renovación silenciosa. `exp` es segundos desde epoch (estándar JWT); `Date.now()` es ms.
  if (payload?.exp && payload.exp * 1000 < Date.now()) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = "?motivo=sesion_expirada";
    const respuesta = NextResponse.redirect(url);
    respuesta.cookies.delete(COOKIE_TOKEN);
    return respuesta;
  }

  const guard = GUARDS_POR_RUTA.find((g) => pathname.startsWith(g.prefijo));
  if (guard) {
    const rol = payload?.rol ?? null;
    if (!rol || !guard.rolesPermitidos.includes(rol)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
