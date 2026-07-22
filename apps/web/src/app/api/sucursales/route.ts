import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function proxy(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("doonflow_token")?.value;
  if (!token) return NextResponse.json({ error: { codigo: "no_autenticado" } }, { status: 401 });

  const url  = `${API_URL}/sucursales${request.nextUrl.search}`;
  const body = request.method === "GET" ? undefined : await request.text();

  const apiRes = await fetch(url, {
    method:  request.method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body:    body || undefined,
  });

  const data = await apiRes.json();
  return NextResponse.json(data, { status: apiRes.status });
}

export const GET  = (req: NextRequest) => proxy(req);
export const POST = (req: NextRequest) => proxy(req);
