"use client";

import Link from "next/link";
import { usarIniciarCertificacion } from "../_hooks/usar-iniciar-certificacion";

export default function PaginaNuevaCertificacion() {
  const {
    clientes, sucursales, clienteId, sucursalId, periodoEtiqueta,
    cargando, iniciando, error, puedeIniciar,
    seleccionarCliente, seleccionarSucursal, setPeriodoEtiqueta, iniciar,
  } = usarIniciarCertificacion();

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/certificaciones" className="hover:text-primary">Certificaciones</Link>
        <span className="mx-1.5">/</span>
        <span>Nueva certificación</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-heading-6 font-bold text-dark dark:text-white">Nueva certificación</h1>
        <p className="text-body-sm text-dark-4 dark:text-dark-6">Indique el período y la sucursal a certificar para iniciar el formulario.</p>
      </div>

      <div className="mx-auto max-w-[560px] rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
        {cargando ? (
          <p className="text-body-sm text-dark-4 dark:text-dark-6">Cargando...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">Cliente</label>
              <select
                value={clienteId}
                onChange={(e) => seleccionarCliente(e.target.value)}
                className="w-full rounded-lg border border-stroke bg-white px-4 py-2.5 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              >
                <option value="">Seleccione un cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.empresa}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">Sucursal</label>
              <select
                value={sucursalId}
                onChange={(e) => seleccionarSucursal(e.target.value)}
                disabled={!clienteId}
                className="w-full rounded-lg border border-stroke bg-white px-4 py-2.5 text-sm text-dark outline-none focus:border-primary disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              >
                <option value="">Seleccione una sucursal...</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">Período</label>
              <input
                type="text"
                value={periodoEtiqueta}
                onChange={(e) => setPeriodoEtiqueta(e.target.value)}
                placeholder="Ej. Julio 2026"
                className="w-full rounded-lg border border-stroke bg-white px-4 py-2.5 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              />
            </div>

            {error && <p className="text-body-sm text-red">{error}</p>}

            <button
              type="button"
              onClick={iniciar}
              disabled={!puedeIniciar}
              className="w-full rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              {iniciando ? "Iniciando..." : "Iniciar formulario"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
