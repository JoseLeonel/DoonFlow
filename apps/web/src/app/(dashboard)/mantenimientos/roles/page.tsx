"use client";

import Link from "next/link";
import { usarMatrizPermisos } from "./_hooks/usar-matriz-permisos";
import { TablaMatrizPermisos } from "./_components/tabla-matriz-permisos";

export default function PaginaRolesPermisos() {
  const { matriz, cargando, guardando, error, hayCambiosPendientes, toggle, guardarCambios } = usarMatrizPermisos();

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/mantenimientos" className="hover:text-primary">Mantenimientos</Link>
        <span className="mx-1.5">/</span>
        <span>Roles y permisos</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-heading-6 font-bold text-dark dark:text-white">Roles y permisos</h1>
        <p className="text-body-sm text-dark-4 dark:text-dark-6">Qué puede hacer cada rol dentro del sistema</p>
      </div>

      {error && <p className="mb-4 text-body-sm text-red">{error}</p>}

      {cargando || !matriz ? (
        <div className="rounded-[10px] bg-white p-12 text-center shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm text-dark-4 dark:text-dark-6">Cargando...</p>
        </div>
      ) : (
        <>
          <TablaMatrizPermisos matriz={matriz} onToggle={toggle} />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={guardarCambios}
              disabled={!hayCambiosPendientes || guardando}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
