import type { AccionCorrectiva, Hallazgo } from "@doonflow/shared";
import { formatearFechaCalendario } from "@doonflow/shared";
import { BadgeEstadoAccion } from "./badge-estado-accion";
import { BadgeSeveridad } from "./badge-severidad";

interface PropsTablaPlanCumplimiento {
  hallazgos: Hallazgo[];
  acciones: AccionCorrectiva[];
  planCerrado: boolean;
  onAgregarAccion: (hallazgoId: string) => void;
}

export function TablaPlanCumplimiento({ hallazgos, acciones, planCerrado, onAgregarAccion }: PropsTablaPlanCumplimiento) {
  const hallazgoPorId = new Map(hallazgos.map((h) => [h.id, h]));

  return (
    <div className={`overflow-x-auto ${planCerrado ? "opacity-90" : ""}`}>
      {acciones.length === 0 ? (
        <div className="p-8 text-center text-body-sm text-dark-4 dark:text-dark-6">
          Todavía no hay acciones correctivas registradas.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3">
              {["Hallazgo", "Acción correctiva", "Responsable", "Fecha límite", "Estado", "Avance", "Evidencias"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {acciones.map((a) => {
              const hallazgo = hallazgoPorId.get(a.hallazgoId);
              const vencida = a.estado === "VENCIDO";
              return (
                <tr
                  key={a.id}
                  className={`border-b border-stroke last:border-0 dark:border-dark-3 ${vencida ? "border-l-4 border-l-red" : ""}`}
                >
                  <td className="px-4 py-3">
                    {hallazgo && (
                      <div className="flex items-center gap-2">
                        <BadgeSeveridad severidad={hallazgo.severidad} />
                        <span className="text-dark dark:text-white">{hallazgo.descripcion}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-dark dark:text-white">{a.descripcion}</td>
                  <td className="px-4 py-3 text-dark-4 dark:text-dark-6">{a.responsableNombre}</td>
                  <td className={`px-4 py-3 ${vencida ? "text-red" : "text-dark-4 dark:text-dark-6"}`}>
                    {formatearFechaCalendario(a.fechaLimite)}
                  </td>
                  <td className="px-4 py-3"><BadgeEstadoAccion estado={a.estado} /></td>
                  <td className="px-4 py-3 text-dark-4 dark:text-dark-6">{a.porcentajeAvance}%</td>
                  <td className="px-4 py-3 text-dark-4 dark:text-dark-6">{a.evidencias.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {!planCerrado && hallazgos.length > 0 && (
        <div className="flex flex-wrap justify-end gap-x-3 p-3">
          {hallazgos.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => onAgregarAccion(h.id)}
              className="text-body-xs font-medium text-primary hover:underline"
            >
              + Acción para &quot;{h.descripcion}&quot;
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
