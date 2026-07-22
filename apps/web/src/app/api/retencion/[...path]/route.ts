import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Proxy genérico para el módulo de retención — adjunta el JWT de la cookie httpOnly a cada petición. */
async function proxy(request: NextRequest, params: { path: string[] }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("doonflow_token")?.value;
  if (!token) return NextResponse.json({ error: { codigo: "no_autenticado" } }, { status: 401 });

  const ruta = params.path.join("/");
  const url = `${API_URL}/retencion/${ruta}${request.nextUrl.search}`;

  const tieneCuerpo = !["GET", "DELETE"].includes(request.method);
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

export const GET = (req: NextRequest, ctx: any) => proxy(req, ctx.params);
export const PUT = (req: NextRequest, ctx: any) => proxy(req, ctx.params);
