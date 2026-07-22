import Link from "next/link";

/**
 * Landing de Analytics. El "panel ejecutivo" descrito en 006/014 (KPIs agregados en pantalla)
 * nunca se implementó (014-panel-calendario-biblioteca sigue sin código, ver memoria/estado.md) —
 * T-382 pedía "agregar 2 accesos al panel ejecutivo existente", pero no hay panel que extender.
 * Se crea esta página nueva con los 2 accesos de 008 en su lugar (desviación documentada en impl.md).
 */
export default function PaginaAnalytics() {
  return (
    <div className="p-6 md:p-7.5">
      <div className="mb-6">
        <h1 className="text-heading-6 font-bold text-dark dark:text-white">Analytics</h1>
        <p className="text-body-sm text-dark-4 dark:text-dark-6">Reportes consolidados y comparativos de certificación</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h2 className="mb-1 font-medium text-dark dark:text-white">Generar reporte</h2>
          <p className="mb-4 text-body-sm text-dark-4 dark:text-dark-6">
            Consolidado por cliente o comparativo entre sucursales, exportable a Excel o PDF.
          </p>
          <Link href="/analytics/reportes/nuevo" className="text-sm font-medium text-primary hover:underline">
            Generar reporte →
          </Link>
        </div>

        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h2 className="mb-1 font-medium text-dark dark:text-white">Historial de reportes</h2>
          <p className="mb-4 text-body-sm text-dark-4 dark:text-dark-6">
            Vuelve a descargar los reportes ya generados sin recalcularlos.
          </p>
          <Link href="/analytics/reportes" className="text-sm font-medium text-primary hover:underline">
            Ver historial →
          </Link>
        </div>
      </div>
    </div>
  );
}
