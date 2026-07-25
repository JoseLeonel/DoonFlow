"use client";

import Link from "next/link";
import { cn } from "@doonflow/shared";
import type { HallazgoFrecuente, SeveridadSugerida } from "../_servicios/hallazgo-frecuente.servicio";

interface PropsTablaHallazgosFrecuentes {
  hallazgosFrecuentes: HallazgoFrecuente[];
  cargando: boolean;
  onAlternarActivo: (id: string, activoActual: boolean) => void;
}

const CLASE_SEVERIDAD: Record<SeveridadSugerida, string> = {
  CRITICA: "text-red",
  MAYOR: "text-naranja",
  MENOR: "text-yellow-dark",
};

export function TablaHallazgosFrecuentes({ hallazgosFrecuentes, cargando, onAlternarActivo }: PropsTablaHallazgosFrecuentes) {
  if (cargando) {
    return (
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-8 text-center text-body-sm text-dark-4 dark:text-dark-6">
        Cargando...
      </div>
    );
  }

  if (hallazgosFrecuentes.length === 0) {
    return (
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-12 text-center">
        <p className="text-body-sm text-dark-4 dark:text-dark-6">No hay hallazgos frecuentes registrados.</p>
        <Link
          href="/mantenimientos/hallazgos-frecuentes/nuevo"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
        >
          <span className="text-base leading-none">+</span> Agregar primer hallazgo frecuente
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3">
              {["Descripción", "Severidad sugerida", "Estado", ""].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke dark:divide-dark-3">
            {hallazgosFrecuentes.map((h) => (
              <tr key={h.id} className="hover:bg-gray-1 dark:hover:bg-dark-2 transition-colors">
                <td className="px-5 py-3.5 font-medium text-dark dark:text-white">{h.descripcionHallazgo}</td>
                <td className={cn("px-5 py-3.5 font-medium", CLASE_SEVERIDAD[h.severidadSugerida])}>{h.severidadSugerida}</td>
                <td className="px-5 py-3.5">
                  <BadgeEstado activo={h.activo} />
                </td>
                <td className="px-5 py-3.5 text-right space-x-3">
                  <Link href={`/mantenimientos/hallazgos-frecuentes/${h.id}/editar`} className="text-sm font-medium text-primary hover:underline">
                    Modificar
                  </Link>
                  <button
                    type="button"
                    onClick={() => onAlternarActivo(h.id, h.activo)}
                    className="text-sm font-medium text-dark-4 hover:underline dark:text-dark-6"
                  >
                    {h.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BadgeEstado({ activo }: { activo: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-body-xs font-medium",
        activo ? "bg-green-light/[0.08] text-green dark:bg-green/10" : "bg-gray-2 text-dark-4 dark:bg-dark-3 dark:text-dark-6",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", activo ? "bg-green" : "bg-dark-4 dark:bg-dark-6")} />
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}
