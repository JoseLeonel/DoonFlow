import Link from "next/link";
import type { CertificadoPublico } from "@doonflow/shared";
import { SelloVerificacion } from "./_components/sello-verificacion";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Server Component: llama directo a la API (server-to-server, sin exponer `API_URL` al
 * navegador) — no reutiliza el proxy `/api/verificacion/[codigo]` porque ese proxy existe
 * para llamadas desde el cliente; aquí ya estamos en el servidor de Next.js.
 */
async function obtenerCertificado(codigo: string): Promise<CertificadoPublico | null> {
  const res = await fetch(`${API_URL}/verificacion/${codigo}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as CertificadoPublico;
}

export default async function PaginaCertificadoPorCodigo({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const resultado = await obtenerCertificado(codigo);

  return (
    <div>
      <SelloVerificacion resultado={resultado} />
      <div className="mt-4 text-center">
        <Link href="/verificar" className="text-body-xs font-medium text-primary hover:underline">
          Verificar otro código
        </Link>
      </div>
    </div>
  );
}
