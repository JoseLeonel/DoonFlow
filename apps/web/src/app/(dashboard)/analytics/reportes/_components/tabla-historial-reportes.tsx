import Link from "next/link";
import { BadgeTipoReporte } from "./badge-tipo-reporte";
import { BadgeFormatoReporte } from "./badge-formato-reporte";
import type { ReporteHistorialItem } from "../_servicios/reportes.servicio";

interface Props {
  reportes: ReporteHistorialItem[];
  cargando: boolean;
  onDescargar: (id: string) => void;
}

export function TablaHistorialReportes({ reportes, cargando, onDescargar }: Props) {
  if (cargando) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-gray-2 dark:bg-dark-3" />)}
      </div>
    );
  }

  if (reportes.length === 0) {
    return (
      <div className="rounded-[10px] bg-white p-12 text-center shadow-1 dark:bg-gray-dark dark:shadow-card">
        <p className="mb-3 text-body-sm text-dark-4 dark:text-dark-6">Todavía no se ha generado ningún reporte.</p>
        <Link href="/analytics/reportes/nuevo" className="text-sm font-medium text-primary hover:underline">Generar el primero</Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3">
              {["Tipo", "Filtros", "Formato", "Generado por", "Fecha", ""].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportes.map((reporte) => (
              <tr key={reporte.id} className="border-b border-stroke last:border-0 dark:border-dark-3">
                <td className="px-5 py-3.5"><BadgeTipoReporte tipo={reporte.tipo} /></td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{reporte.resumenFiltros}</td>
                <td className="px-5 py-3.5"><BadgeFormatoReporte formato={reporte.formato} /></td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{reporte.generadoPorNombre}</td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{new Date(reporte.creadoEn).toLocaleDateString("es-CR")}</td>
                <td className="px-5 py-3.5 text-right">
                  <button type="button" onClick={() => onDescargar(reporte.id)} className="text-sm font-medium text-primary hover:underline">
                    Descargar
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
