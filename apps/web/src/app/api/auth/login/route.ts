import { NextResponse, type NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const COOKIE_NOMBRE = "doonflow_token";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 horas

/**
 * Route Handler: POST /api/auth/login
 * Proxy hacia la API Express + setea el token en cookie httpOnly segura.
 * La capa de servicio del frontend llama aquí; nunca expone el token al JS del cliente.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  // Llamar a la API Express
  let apiRes: Response;
  try {
    apiRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { error: { codigo: "api_no_disponible", mensaje: "El servidor no está disponible." } },
      { status: 503 },
    );
  }

  const data = await apiRes.json();

  if (!apiRes.ok) {
    return NextResponse.json(data, { status: apiRes.status });
  }

  // Setear el token como cookie httpOnly (el JS del cliente no puede leerlo)
  const token = data?.data?.tokenAcceso;
  if (!token) {
    return NextResponse.json(
      { error: { codigo: "token_ausente", mensaje: "La API no devolvió un token." } },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ data: { usuario: data.data.usuario } });
  response.cookies.set(COOKIE_NOMBRE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
