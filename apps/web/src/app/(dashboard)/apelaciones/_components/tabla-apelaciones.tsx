import Link from "next/link";
import type { Apelacion } from "@doonflow/shared";
import { BadgeEstadoApelacion } from "./badge-estado-apelacion";

interface PropsTablaApelaciones {
  apelaciones: Apelacion[];
}

const ETIQUETA_TIPO: Record<Apelacion["tipo"], string> = {
  SOBRE_HALLAZGO: "Sobre hallazgo",
  SOBRE_RESULTADO: "Sobre resultado",
};

function antiguedad(solicitadoEn: string): string {
  const dias = Math.floor((Date.now() - new Date(solicitadoEn).getTime()) / (1000 * 60 * 60 * 24));
  return dias <= 0 ? "Hoy" : `${dias} día${dias === 1 ? "" : "s"}`;
}

export function TablaApelaciones({ apelaciones }: PropsTablaApelaciones) {
  if (apelaciones.length === 0) {
    return (
      <div className="p-8 text-center text-body-sm text-dark-4 dark:text-dark-6">
        No hay apelaciones abiertas.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stroke dark:border-dark-3">
            {["Certificación / Sucursal", "Tipo", "Solicitado por", "Antigüedad", "Estado"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {apelaciones.map((a) => (
            <tr key={a.id} className="border-b border-stroke last:border-0 hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-2">
              <td className="px-4 py-3">
                <Link href={`/apelaciones/${a.id}`} className="text-dark hover:text-primary dark:text-white">
                  {a.inspeccionEtiqueta}
                </Link>
              </td>
              <td className="px-4 py-3 text-dark-4 dark:text-dark-6">{ETIQUETA_TIPO[a.tipo]}</td>
              <td className="px-4 py-3 text-dark-4 dark:text-dark-6">{a.solicitadoPorNombre}</td>
              <td className="px-4 py-3 text-dark-4 dark:text-dark-6">{antiguedad(a.solicitadoEn)}</td>
              <td className="px-4 py-3"><BadgeEstadoApelacion estado={a.estado} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
