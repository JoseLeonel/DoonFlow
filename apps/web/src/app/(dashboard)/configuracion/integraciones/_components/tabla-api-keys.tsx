"use client";

import { cn } from "@doonflow/shared";
import type { ApiKey } from "../_servicios/api-key.servicio";

interface PropsTablaApiKeys {
  apiKeys: ApiKey[];
  cargando: boolean;
  onSolicitarRevocar: (id: string, nombre: string) => void;
}

function formatearFecha(fecha: string | null): string {
  return fecha ? new Date(fecha).toLocaleString("es-CR") : "Nunca";
}

export function TablaApiKeys({ apiKeys, cargando, onSolicitarRevocar }: PropsTablaApiKeys) {
  if (cargando) {
    return (
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-8 text-center text-body-sm text-dark-4 dark:text-dark-6">
        Cargando...
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-12 text-center">
        <p className="text-body-sm text-dark-4 dark:text-dark-6">No hay claves de API generadas.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3">
              {["Nombre", "Estado", "Último uso", ""].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke dark:divide-dark-3">
            {apiKeys.map((k) => (
              <tr key={k.id} className="hover:bg-gray-1 dark:hover:bg-dark-2 transition-colors">
                <td className="px-5 py-3.5 font-medium text-dark dark:text-white">{k.nombre}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-body-xs font-medium",
                      k.activa ? "bg-green-light/[0.08] text-green" : "bg-gray-2 text-dark-4 dark:bg-dark-3 dark:text-dark-6",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", k.activa ? "bg-green" : "bg-dark-4 dark:bg-dark-6")} />
                    {k.activa ? "Activa" : "Revocada"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{formatearFecha(k.ultimoUsoEn)}</td>
                <td className="px-5 py-3.5 text-right">
                  {k.activa && (
                    <button
                      type="button"
                      onClick={() => onSolicitarRevocar(k.id, k.nombre)}
                      className="text-sm font-medium text-red hover:underline"
                    >
                      Revocar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
