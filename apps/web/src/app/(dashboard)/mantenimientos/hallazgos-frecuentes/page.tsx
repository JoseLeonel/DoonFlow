"use client";

import Link from "next/link";
import { useHallazgosFrecuentes } from "./_hooks/use-hallazgos-frecuentes";
import { TablaHallazgosFrecuentes } from "./_components/tabla-hallazgos-frecuentes";

export default function PaginaHallazgosFrecuentes() {
  const { hallazgosFrecuentes, cargando, error, alternarActivo } = useHallazgosFrecuentes();

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/mantenimientos" className="hover:text-primary">Mantenimientos</Link>
        <span className="mx-1.5">/</span>
        <span>Hallazgos frecuentes</span>
      </nav>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-heading-6 font-bold text-dark dark:text-white">Hallazgos frecuentes</h1>
          <p className="text-body-sm text-dark-4 dark:text-dark-6">
            Biblioteca reutilizable de hallazgos y acciones correctivas comunes.
          </p>
        </div>
        <Link href="/mantenimientos/hallazgos-frecuentes/nuevo" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">
          + Agregar hallazgo frecuente
        </Link>
      </div>

      {error && <p className="mb-4 text-body-sm text-red">{error}</p>}

      <TablaHallazgosFrecuentes hallazgosFrecuentes={hallazgosFrecuentes} cargando={cargando} onAlternarActivo={alternarActivo} />
    </div>
  );
}
