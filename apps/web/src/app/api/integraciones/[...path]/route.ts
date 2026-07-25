import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Proxy genérico para el módulo de integraciones (009-integraciones-datos-masivos, alcance
 * reducido a importación masiva). Reenvía el cuerpo crudo (blob) sin parsear, mismo patrón
 * que `/api/inspeccion/[...path]` — necesario para la subida de archivos Excel
 * (`multipart/form-data`). A diferencia de otros proxies, la respuesta **no siempre es JSON**:
 * la plantilla descargable y el detalle de errores son binarios/adjuntos (`Content-Disposition:
 * attachment`), así que se pasan tal cual en vez de forzar `apiRes.json()`.
 */
async function proxy(request: NextRequest, params: { path: string[] }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("doonflow_token")?.value;
  if (!token) return NextResponse.json({ error: { codigo: "no_autenticado" } }, { status: 401 });

  const ruta = params.path.join("/");
  const url = `${API_URL}/integraciones/${ruta}${request.nextUrl.search}`;

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

  const tipoRespuesta = apiRes.headers.get("content-type") ?? "";
  if (!tipoRespuesta.includes("application/json")) {
    const buffer = await apiRes.arrayBuffer();
    const headers = new Headers();
    headers.set("Content-Type", tipoRespuesta);
    const disposicion = apiRes.headers.get("content-disposition");
    if (disposicion) headers.set("Content-Disposition", disposicion);
    return new NextResponse(buffer, { status: apiRes.status, headers });
  }

  const data = await apiRes.json();
  return NextResponse.json(data, { status: apiRes.status });
}

export const GET  = async (req: NextRequest, ctx: any) => proxy(req, await ctx.params);
export const POST = async (req: NextRequest, ctx: any) => proxy(req, await ctx.params);
