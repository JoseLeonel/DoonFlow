import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Proxy genérico para el módulo de inspecciones.
 * Adjunta el JWT de la cookie httpOnly a cada petición hacia la API Express.
 */
async function proxy(request: NextRequest, params: { path: string[] }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("doonflow_token")?.value;
  if (!token) return NextResponse.json({ error: { codigo: "no_autenticado" } }, { status: 401 });

  const ruta = params.path.join("/");
  const url = `${API_URL}/inspeccion/${ruta}${request.nextUrl.search}`;

  const tieneCuerpo = !["GET", "DELETE"].includes(request.method);
  // Se reenvía el cuerpo crudo (blob) sin parsear, respetando el Content-Type original —
  // necesario para las evidencias de certificaciones (multipart/form-data), que un
  // Content-Type fijo en "application/json" rompería (T-223).
  const contentType = request.headers.get("content-type");

  const apiRes = await fetch(url, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(contentType ? { "Content-Type": contentType } : {}),
    },
    body: tieneCuerpo ? await request.blob() : undefined,
  });

  const data = await apiRes.json();
  return NextResponse.json(data, { status: apiRes.status });
}

export const GET    = (req: NextRequest, ctx: any) => proxy(req, ctx.params);
export const POST   = (req: NextRequest, ctx: any) => proxy(req, ctx.params);
export const PATCH  = (req: NextRequest, ctx: any) => proxy(req, ctx.params);
export const DELETE = (req: NextRequest, ctx: any) => proxy(req, ctx.params);
