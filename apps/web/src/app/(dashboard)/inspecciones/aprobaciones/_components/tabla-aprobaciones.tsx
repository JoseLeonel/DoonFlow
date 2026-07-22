"use client";

import { useState } from "react";
import type { Plantilla } from "../../_servicios/inspeccion.servicio";
import { DialogoRechazoPlantilla } from "./dialogo-rechazo-plantilla";

const ETIQUETAS_TIPO: Record<string, string> = {
  MINISTERIO_SALUD: "Min. Salud",
  AUDITORIA_INTERNA: "Auditoría interna",
  CALIDAD: "Calidad",
  SEGURIDAD_OCUPACIONAL: "Seg. Ocupacional",
  SUPERVISION_OPERATIVA: "Supervisión",
  OTRO: "Otro",
};

interface PropsTablaAprobaciones {
  pendientes: Plantilla[];
  cargando: boolean;
  procesandoId: string | null;
  onAprobar: (id: string) => void;
  onRechazar: (id: string, comentario: string) => void;
}

export function TablaAprobaciones({ pendientes, cargando, procesandoId, onAprobar, onRechazar }: PropsTablaAprobaciones) {
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);

  if (cargando) {
    return (
      <div className="rounded-[10px] bg-white p-12 text-center shadow-1 dark:bg-gray-dark dark:shadow-card">
        <p className="text-body-sm text-dark-4 dark:text-dark-6">Cargando...</p>
      </div>
    );
  }

  if (pendientes.length === 0) {
    return (
      <div className="rounded-[10px] bg-white p-12 text-center shadow-1 dark:bg-gray-dark dark:shadow-card">
        <p className="text-body-sm text-dark-4 dark:text-dark-6">No hay plantillas pendientes de aprobación.</p>
      </div>
    );
  }

  const plantillaEnDialogo = pendientes.find((p) => p.id === rechazandoId);

  return (
    <>
      <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stroke dark:border-dark-3">
                {["Nombre", "Tipo", "Solicitado por", "Solicitado en", ""].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendientes.map((p) => (
                <tr key={p.id} className="border-b border-stroke last:border-0 dark:border-dark-3">
                  <td className="px-5 py-3.5 font-medium text-dark dark:text-white">{p.nombre}</td>
                  <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{ETIQUETAS_TIPO[p.tipo] ?? p.tipo}</td>
                  <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{p.solicitadoPorId ?? "—"}</td>
                  <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">
                    {p.solicitadoEn ? new Date(p.solicitadoEn).toLocaleDateString("es-CR") : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={procesandoId === p.id}
                        onClick={() => onAprobar(p.id)}
                        className="rounded-lg bg-green-light-7 px-3 py-1.5 text-body-xs font-medium text-green-dark hover:bg-green-light-6 disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        disabled={procesandoId === p.id}
                        onClick={() => setRechazandoId(p.id)}
                        className="rounded-lg bg-red-light/[0.1] px-3 py-1.5 text-body-xs font-medium text-red hover:bg-red-light/[0.18] disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DialogoRechazoPlantilla
        abierto={!!plantillaEnDialogo}
        nombrePlantilla={plantillaEnDialogo?.nombre ?? ""}
        onRechazar={(comentario) => {
          if (rechazandoId) onRechazar(rechazandoId, comentario);
          setRechazandoId(null);
        }}
        onCancelar={() => setRechazandoId(null)}
      />
    </>
  );
}
