import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Proxy de solo lectura para el registro de auditoría — adjunta el JWT de la cookie httpOnly. */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("doonflow_token")?.value;
  if (!token) return NextResponse.json({ error: { codigo: "no_autenticado" } }, { status: 401 });

  const url = `${API_URL}/auditoria${request.nextUrl.search}`;
  const apiRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await apiRes.json();
  return NextResponse.json(data, { status: apiRes.status });
}
