import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("doonflow_token")?.value;
  if (!token) return NextResponse.json({ error: { codigo: "no_autenticado" } }, { status: 401 });

  const apiRes = await fetch(`${API_URL}/notificaciones${request.nextUrl.search}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await apiRes.json();
  return NextResponse.json(data, { status: apiRes.status });
}
