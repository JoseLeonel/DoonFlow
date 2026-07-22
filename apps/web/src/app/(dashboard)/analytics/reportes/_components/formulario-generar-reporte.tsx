"use client";

import { Boton } from "@doonflow/ui";
import type { FormatoReporte, TipoReporte } from "../_servicios/reportes.servicio";

interface Props {
  tipo: TipoReporte;
  onTipoChange: (tipo: TipoReporte) => void;
  clienteId: string;
  onClienteIdChange: (id: string) => void;
  clientes: { id: string; empresa: string }[];
  clienteFijo?: { id: string; empresa: string } | null;
  sucursalIds: string[];
  onSucursalIdsChange: (ids: string[]) => void;
  sucursalesDelCliente: { id: string; nombre: string }[];
  fechaDesde: string;
  onFechaDesdeChange: (v: string) => void;
  fechaHasta: string;
  onFechaHastaChange: (v: string) => void;
  formato: FormatoReporte;
  onFormatoChange: (formato: FormatoReporte) => void;
  generando: boolean;
  onGenerar: () => void;
}

/** Formulario controlado — todo el estado vive en el hook `usarGenerarReporte`, aquí solo se renderiza y notifica cambios. */
export function FormularioGenerarReporte({
  tipo, onTipoChange,
  clienteId, onClienteIdChange, clientes, clienteFijo,
  sucursalIds, onSucursalIdsChange, sucursalesDelCliente,
  fechaDesde, onFechaDesdeChange,
  fechaHasta, onFechaHastaChange,
  formato, onFormatoChange,
  generando, onGenerar,
}: Props) {
  const habilitado =
    !!clienteId &&
    !!fechaDesde &&
    !!fechaHasta &&
    (tipo !== "COMPARATIVO_SUCURSALES" || sucursalIds.length > 0);

  function toggleSucursal(id: string) {
    onSucursalIdsChange(sucursalIds.includes(id) ? sucursalIds.filter((s) => s !== id) : [...sucursalIds, id]);
  }

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-body-sm font-medium text-dark dark:text-white">Tipo de reporte *</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-dark dark:text-white">
              <input type="radio" name="tipo" checked={tipo === "CONSOLIDADO_CLIENTE"} onChange={() => onTipoChange("CONSOLIDADO_CLIENTE")} />
              Consolidado por cliente
            </label>
            <label className="flex items-center gap-2 text-sm text-dark dark:text-white">
              <input type="radio" name="tipo" checked={tipo === "COMPARATIVO_SUCURSALES"} onChange={() => onTipoChange("COMPARATIVO_SUCURSALES")} />
              Comparativo entre sucursales
            </label>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-body-sm font-medium text-dark dark:text-white">Cliente *</label>
          {clienteFijo ? (
            <p className="text-sm text-dark-4 dark:text-dark-6">{clienteFijo.empresa}</p>
          ) : (
            <select
              value={clienteId}
              onChange={(e) => onClienteIdChange(e.target.value)}
              className="w-full max-w-sm rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            >
              <option value="">Selecciona un cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.empresa}</option>)}
            </select>
          )}
        </div>

        {tipo === "COMPARATIVO_SUCURSALES" && (
          <div>
            <label className="mb-2 block text-body-sm font-medium text-dark dark:text-white">Sucursales a comparar *</label>
            <div className="flex flex-wrap gap-3">
              {sucursalesDelCliente.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-dark dark:text-white">
                  <input type="checkbox" checked={sucursalIds.includes(s.id)} onChange={() => toggleSucursal(s.id)} />
                  {s.nombre}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="mb-2 block text-body-sm font-medium text-dark dark:text-white">Desde *</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => onFechaDesdeChange(e.target.value)}
              className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-body-sm font-medium text-dark dark:text-white">Hasta *</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => onFechaHastaChange(e.target.value)}
              className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-body-sm font-medium text-dark dark:text-white">Formato de exportación *</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-dark dark:text-white">
              <input type="radio" name="formato" checked={formato === "EXCEL"} onChange={() => onFormatoChange("EXCEL")} />
              Excel
            </label>
            <label className="flex items-center gap-2 text-sm text-dark dark:text-white">
              <input type="radio" name="formato" checked={formato === "PDF"} onChange={() => onFormatoChange("PDF")} />
              PDF
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Boton type="button" onClick={onGenerar} disabled={!habilitado || generando} cargando={generando} className="w-auto px-6">
          Generar
        </Boton>
      </div>
    </div>
  );
}
