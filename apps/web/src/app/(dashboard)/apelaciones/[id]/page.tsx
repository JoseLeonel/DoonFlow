"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useResolverApelacion } from "../_hooks/use-resolver-apelacion";
import { PanelResolucionApelacion } from "../_components/panel-resolucion-apelacion";

export default function PaginaDetalleApelacion() {
  const { id } = useParams<{ id: string }>();
  const { apelacion, cargando, error, guardando, errorResolver, resolver } = useResolverApelacion(id);

  if (cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-stroke border-t-primary" />
      </div>
    );
  }

  if (error || !apelacion) {
    return <p className="p-8 text-red">{error ?? "No se pudo cargar la apelación."}</p>;
  }

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-4 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/apelaciones" className="hover:text-primary">Apelaciones</Link>
        <span className="mx-1.5">/</span>
        <span>{apelacion.inspeccionEtiqueta}</span>
      </nav>

      <div className="mx-auto max-w-[720px]">
        <PanelResolucionApelacion
          apelacion={apelacion}
          guardando={guardando}
          error={errorResolver}
          onResolver={(estado, comentario) => {
            resolver(estado, comentario).catch(() => undefined);
          }}
        />
      </div>
    </div>
  );
}
