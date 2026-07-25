"use client";

import { useApelaciones } from "./_hooks/use-apelaciones";
import { TablaApelaciones } from "./_components/tabla-apelaciones";

export default function PaginaApelaciones() {
  const { apelaciones, cargando, error } = useApelaciones();

  return (
    <div className="p-6 md:p-7.5">
      <h1 className="mb-1 text-heading-6 font-bold text-dark dark:text-white">Apelaciones</h1>
      <p className="mb-6 text-body-sm text-dark-4 dark:text-dark-6">Apelaciones abiertas, ordenadas por antigüedad.</p>

      {cargando ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-stroke border-t-primary" />
        </div>
      ) : error ? (
        <p className="text-red">
          {error.toLowerCase().includes("permiso") ? "No tienes permiso para resolver apelaciones." : error}
        </p>
      ) : (
        <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
          <TablaApelaciones apelaciones={apelaciones} />
        </div>
      )}
    </div>
  );
}
