"use client";

import Link from "next/link";
import { usePoliticaRetencion } from "./_hooks/use-politica-retencion";
import { FormularioRetencion } from "./_components/formulario-retencion";

export default function PaginaPoliticaRetencion() {
  const { politicas, cambios, cargando, guardando, error, hayCambiosPendientes, editar, guardarCambios } = usePoliticaRetencion();

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/mantenimientos" className="hover:text-primary">Mantenimientos</Link>
        <span className="mx-1.5">/</span>
        <span>Política de retención</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-heading-6 font-bold text-dark dark:text-white">Política de retención</h1>
        <p className="text-body-sm text-dark-4 dark:text-dark-6">Cuánto tiempo se conservan las evidencias y los datos personales antes de anonimizarlos o eliminarlos</p>
      </div>

      {error && <p className="mb-4 text-body-sm text-red">{error}</p>}

      {cargando ? (
        <div className="rounded-[10px] bg-white p-12 text-center shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm text-dark-4 dark:text-dark-6">Cargando...</p>
        </div>
      ) : (
        <FormularioRetencion
          politicas={politicas}
          cambios={cambios}
          guardando={guardando}
          hayCambiosPendientes={hayCambiosPendientes}
          onEditar={editar}
          onGuardar={guardarCambios}
        />
      )}
    </div>
  );
}
