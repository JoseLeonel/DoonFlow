"use client";

import { cn } from "@doonflow/shared";
import Link from "next/link";
import { useState } from "react";
import type { Plantilla } from "../_servicios/inspeccion.servicio";
import { BadgeTipo } from "./badge-tipo";

interface Props {
  plantillas: Plantilla[];
  onToggleEstado: (id: string, activar: boolean) => void;
  onClonar: (id: string) => void;
}

export function TablaPlantillas({ plantillas, onToggleEstado, onClonar }: Props) {
  const [clonandoId, setClonandoId] = useState<string | null>(null);

  if (plantillas.length === 0) {
    return (
      <div className="rounded-[10px] border border-stroke bg-white p-12 text-center dark:border-dark-3 dark:bg-gray-dark">
        <p className="text-dark-4 dark:text-dark-6">No hay plantillas registradas aún.</p>
        <p className="mt-1 text-body-sm text-dark-5 dark:text-dark-6">
          Crea tu primera plantilla con el botón de arriba.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stroke bg-gray-1 dark:border-dark-3 dark:bg-dark-2">
              <th className="px-6 py-4 text-left font-medium text-dark-4 dark:text-dark-6 uppercase text-body-xs tracking-wide">Nombre</th>
              <th className="px-4 py-4 text-left font-medium text-dark-4 dark:text-dark-6 uppercase text-body-xs tracking-wide">Tipo</th>
              <th className="px-4 py-4 text-center font-medium text-dark-4 dark:text-dark-6 uppercase text-body-xs tracking-wide">Puntaje</th>
              <th className="px-4 py-4 text-center font-medium text-dark-4 dark:text-dark-6 uppercase text-body-xs tracking-wide">Estado</th>
              <th className="px-4 py-4 text-center font-medium text-dark-4 dark:text-dark-6 uppercase text-body-xs tracking-wide">Versión</th>
              <th className="px-6 py-4 text-right font-medium text-dark-4 dark:text-dark-6 uppercase text-body-xs tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {plantillas.map((p) => (
              <tr
                key={p.id}
                className="border-b border-stroke last:border-0 hover:bg-gray-1/50 dark:border-dark-3 dark:hover:bg-dark-2/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div>
                    <Link href={`/inspecciones/${p.id}`} className="font-medium text-dark hover:text-primary dark:text-white dark:hover:text-primary transition-colors">
                      {p.nombre}
                    </Link>
                    {p.descripcion && (
                      <p className="mt-0.5 text-body-xs text-dark-5 dark:text-dark-6 line-clamp-1">
                        {p.descripcion}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4"><BadgeTipo tipo={p.tipo} /></td>
                <td className="px-4 py-4 text-center font-medium text-dark dark:text-white">{p.puntajeMaximo}</td>
                <td className="px-4 py-4 text-center">
                  <button
                    onClick={() => onToggleEstado(p.id, !p.activa)}
                    className={cn(
                      "rounded-full px-3 py-1 text-body-xs font-medium transition-colors cursor-pointer",
                      p.activa
                        ? "bg-green-light-7 text-green-dark hover:bg-green-light-6"
                        : "bg-gray-2 text-dark-5 hover:bg-gray-3 dark:bg-dark-3 dark:text-dark-6",
                    )}
                  >
                    {p.activa ? "Activa" : "Inactiva"}
                  </button>
                </td>
                <td className="px-4 py-4 text-center text-dark-4 dark:text-dark-6">v{p.version}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/inspecciones/${p.id}`}
                      className="rounded-lg bg-primary/[0.08] px-3 py-1.5 text-body-xs font-medium text-primary hover:bg-primary/[0.14] transition-colors"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/inspecciones/${p.id}/ejecutar`}
                      className="rounded-lg bg-green-light-7 px-3 py-1.5 text-body-xs font-medium text-green-dark hover:bg-green-light-6 transition-colors"
                    >
                      Inspeccionar
                    </Link>
                    <button
                      onClick={() => { setClonandoId(p.id); onClonar(p.id); }}
                      className="rounded-lg bg-gray-2 px-3 py-1.5 text-body-xs font-medium text-dark-4 hover:bg-gray-3 dark:bg-dark-3 dark:text-dark-6 transition-colors"
                    >
                      Clonar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
