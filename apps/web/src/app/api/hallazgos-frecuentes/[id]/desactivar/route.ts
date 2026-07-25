import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function POST(request: NextRequest, context: any) {
  const cookieStore = await cookies();
  const token = cookieStore.get("doonflow_token")?.value;
  if (!token) return NextResponse.json({ error: { codigo: "no_autenticado" } }, { status: 401 });

  const { id } = await context.params;
  const apiRes = await fetch(`${API_URL}/hallazgos-frecuentes/${id}/desactivar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await apiRes.json();
  return NextResponse.json(data, { status: apiRes.status });
}
