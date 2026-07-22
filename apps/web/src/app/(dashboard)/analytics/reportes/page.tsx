"use client";

import Link from "next/link";
import { Paginador } from "@doonflow/ui";
import { usarHistorialReportes } from "./_hooks/usar-historial-reportes";
import { TablaHistorialReportes } from "./_components/tabla-historial-reportes";

export default function PaginaHistorialReportes() {
  const { reportes, total, pagina, porPagina, filtros, cargando, error, cambiarFiltros, cambiarPagina, cambiarPorPagina, descargar } = usarHistorialReportes();

  return (
    <div className="p-6 md:p-7.5">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
            <Link href="/analytics" className="hover:text-primary">Analytics</Link>
            <span className="mx-1.5">/</span>
            <span>Reportes</span>
          </nav>
          <h1 className="text-heading-6 font-bold text-dark dark:text-white">Historial de reportes</h1>
          <p className="mt-1 text-body-sm text-dark-4 dark:text-dark-6">Reportes generados anteriormente, listos para descargar</p>
        </div>

        <Link
          href="/analytics/reportes/nuevo"
          className="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 transition-colors md:self-auto"
        >
          + Generar reporte
        </Link>
      </div>

      <div className="mb-4">
        <select
          value={filtros.tipo}
          onChange={(e) => cambiarFiltros({ tipo: e.target.value as any })}
          className="rounded-lg border border-stroke bg-white px-3 py-1.5 text-body-sm text-dark outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        >
          <option value="">Todos los tipos</option>
          <option value="CONSOLIDADO_CLIENTE">Consolidado</option>
          <option value="COMPARATIVO_SUCURSALES">Comparativo</option>
        </select>
      </div>

      {error ? (
        <div className="rounded-[10px] border border-red-light bg-red-light/[0.06] p-6 text-center text-sm text-red">{error}</div>
      ) : (
        <>
          <TablaHistorialReportes reportes={reportes} cargando={cargando} onDescargar={descargar} />
          {!cargando && total > 0 && (
            <Paginador pagina={pagina} porPagina={porPagina} total={total} onCambiarPagina={cambiarPagina} onCambiarPorPagina={cambiarPorPagina} />
          )}
        </>
      )}
    </div>
  );
}
