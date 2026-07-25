"use client";

import { useState } from "react";
import Link from "next/link";
import { TablaPlantillas } from "./_components/tabla-plantillas";
import { usePlantillas } from "./_hooks/use-plantillas";

export default function PaginaPlantillas() {
  const { plantillas, total, cargando, error, recargar, toggleEstado, clonar } = usePlantillas("");
  const [filtro, setFiltro] = useState<"todas" | "activas" | "inactivas">("todas");

  const plantillasFiltradas = plantillas.filter((p) => {
    if (filtro === "activas") return p.activa;
    if (filtro === "inactivas") return !p.activa;
    return true;
  });

  const handleClonar = async (id: string) => {
    const nombre = window.prompt("Nombre para la copia:");
    if (!nombre) return;
    await clonar(id, nombre);
  };

  return (
    <div className="p-6 md:p-7.5">
      {/* Cabecera */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-heading-6 font-bold text-dark dark:text-white">
            Plantillas de inspección
          </h1>
          <p className="mt-1 text-body-sm text-dark-4 dark:text-dark-6">
            {total} plantilla{total !== 1 ? "s" : ""} registrada{total !== 1 ? "s" : ""}
          </p>
        </div>

        <Link
          href="/inspecciones/nueva"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva plantilla
        </Link>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-2">
        {(["todas", "activas", "inactivas"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-lg px-4 py-2 text-body-sm font-medium capitalize transition-colors ${
              filtro === f
                ? "bg-primary text-white"
                : "bg-white text-dark-4 hover:bg-gray-1 dark:bg-dark-2 dark:text-dark-6 dark:hover:bg-dark-3"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {cargando ? (
        <div className="flex items-center justify-center py-16">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-stroke border-t-primary" />
        </div>
      ) : error ? (
        <div className="rounded-[10px] border border-red-light bg-red-light/[0.06] p-6 text-center text-sm text-red">
          {error}
          <button onClick={recargar} className="ml-3 underline">Reintentar</button>
        </div>
      ) : (
        <TablaPlantillas
          plantillas={plantillasFiltradas}
          onToggleEstado={toggleEstado}
          onClonar={handleClonar}
        />
      )}
    </div>
  );
}
