"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { usePresentarApelacion } from "../../../_hooks/use-presentar-apelacion";
import { FormularioApelacion } from "../../../_components/formulario-apelacion";

export default function PaginaNuevaApelacion() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hallazgosActivos, cargando, error, diasRestantes, plazoVencido, guardando, errorEnvio, enviar } = usePresentarApelacion(id);

  if (cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-stroke border-t-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="p-8 text-red">{error}</p>;
  }

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-4 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/certificaciones" className="hover:text-primary">Certificaciones</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/certificaciones/${id}/revision`} className="hover:text-primary">Certificación</Link>
        <span className="mx-1.5">/</span>
        <span>Presentar apelación</span>
      </nav>

      <div className="mx-auto max-w-[720px]">
        <h1 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">Presentar apelación</h1>
        <FormularioApelacion
          hallazgosActivos={hallazgosActivos}
          diasRestantes={diasRestantes}
          plazoVencido={plazoVencido}
          guardando={guardando}
          error={errorEnvio}
          onEnviar={(datos) => enviar(datos)}
          onCancelar={() => router.push(`/certificaciones/${id}/revision`)}
        />
      </div>
    </div>
  );
}
