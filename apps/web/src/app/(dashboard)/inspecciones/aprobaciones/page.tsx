"use client";

import Link from "next/link";
import { usarAprobaciones } from "./_hooks/usar-aprobaciones";
import { TablaAprobaciones } from "./_components/tabla-aprobaciones";

export default function PaginaAprobacionesPendientes() {
  const { pendientes, cargando, procesandoId, error, aprobar, rechazar } = usarAprobaciones();

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/inspecciones" className="hover:text-primary">Inspecciones</Link>
        <span className="mx-1.5">/</span>
        <span>Aprobaciones pendientes</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-heading-6 font-bold text-dark dark:text-white">Aprobaciones pendientes</h1>
        <p className="text-body-sm text-dark-4 dark:text-dark-6">Plantillas de ficha en espera de revisión</p>
      </div>

      {error && <p className="mb-4 text-body-sm text-red">{error}</p>}

      <TablaAprobaciones
        pendientes={pendientes}
        cargando={cargando}
        procesandoId={procesandoId}
        onAprobar={aprobar}
        onRechazar={rechazar}
      />
    </div>
  );
}
