"use client";

import type { RegistroCertificacion } from "../_servicios/sucursal.servicio";

export function TablaHistoricoCertificaciones({ registros }: { registros: RegistroCertificacion[] }) {
  if (registros.length === 0) {
    return (
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-12 text-center">
        <p className="text-body-sm text-dark-4 dark:text-dark-6">Esta sucursal no tiene inspecciones registradas.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3">
              {["Fecha", "Plantilla", "Puntaje", "Clasificación"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke dark:divide-dark-3">
            {registros.map((r, i) => (
              <tr key={i} className="hover:bg-gray-1 dark:hover:bg-dark-2 transition-colors">
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">
                  {new Date(r.fecha).toLocaleDateString("es-CR")}
                </td>
                <td className="px-5 py-3.5 font-medium text-dark dark:text-white">{r.plantillaNombre}</td>
                <td className="px-5 py-3.5 font-bold text-primary">
                  {r.puntajeObtenido} / {r.puntajeMaximo}
                </td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{r.clasificacion ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
