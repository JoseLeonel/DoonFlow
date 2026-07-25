"use client";

import Link from "next/link";
import { TarjetaKpi } from "@doonflow/ui";
import { usePanelEjecutivo } from "./_hooks/use-panel-ejecutivo";
import { TablaAtencionRequerida } from "./_components/tabla-atencion-requerida";

/**
 * Panel ejecutivo (014-panel-calendario-biblioteca, HU-4). Reemplaza la landing de accesos
 * rápidos que existía desde 008 (cuando el panel ejecutivo todavía no existía, ver historial
 * en `memoria/estado.md`) — los accesos a reportes se conservan al final de la página.
 */
export default function PaginaAnalytics() {
  const { panel, clientes, clienteSeleccionado, setClienteSeleccionado, filtroClienteOculto, cargando, error } = usePanelEjecutivo();

  return (
    <div className="p-6 md:p-7.5">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-6 font-bold text-dark dark:text-white">Panel ejecutivo</h1>
          <p className="text-body-sm text-dark-4 dark:text-dark-6">Estado de cumplimiento agregado de la empresa</p>
        </div>

        {!filtroClienteOculto && clientes.length > 0 && (
          <select
            value={clienteSeleccionado}
            onChange={(e) => setClienteSeleccionado(e.target.value)}
            className="rounded-lg border border-stroke bg-white px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white"
          >
            <option value="">Todos los clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.empresa}</option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="mb-4 text-body-sm text-red">{error}</p>}

      {cargando || !panel ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-[10px] bg-gray-2 dark:bg-dark-3" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TarjetaKpi valor={`${panel.pctSucursalesVigentes}%`} etiqueta="Sucursales vigentes" />
            <TarjetaKpi valor={panel.certificacionesPorVencer30d} etiqueta="Certificaciones por vencer (30 días)" />
            <TarjetaKpi valor={panel.hallazgosCriticosAbiertos} etiqueta="Hallazgos críticos abiertos" />
            <TarjetaKpi valor={panel.accionesVencidas} etiqueta="Acciones vencidas" />
          </div>

          <div className="mt-6 rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
            <div className="border-b border-stroke px-5 py-3.5 dark:border-dark-3">
              <h2 className="text-body-sm font-semibold text-dark dark:text-white">Atención requerida</h2>
            </div>
            <TablaAtencionRequerida items={panel.atencionRequerida} />
          </div>
        </>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
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
