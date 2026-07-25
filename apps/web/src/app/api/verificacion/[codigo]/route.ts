import { NextResponse, type NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Portal público — SIN adjuntar cookie/Authorization, reenvía anónimo (ver spec 006 → regla 2). */
export async function GET(request: NextRequest, context: any) {
  const { codigo } = await context.params;
  const apiRes = await fetch(`${API_URL}/verificacion/${codigo}`);
  const data = await apiRes.json();
  return NextResponse.json(data, { status: apiRes.status });
}
