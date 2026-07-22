"use client";

import { useState } from "react";
import type { RegistroAuditoria } from "../_servicios/auditoria.servicio";
import type { FiltrosAuditoriaUI } from "../_hooks/usar-auditoria";

const ACCIONES_CONOCIDAS = [
  "LOGIN",
  "LOGIN_FALLIDO",
  "PERMISO_MODIFICADO",
  "USUARIO_DESACTIVADO",
  "CLIENTE_DESACTIVADO",
  "SUCURSAL_DESACTIVADO",
  "RETENCION_ANONIMIZADO",
  "RETENCION_ELIMINADO",
];

interface Props {
  registros: RegistroAuditoria[];
  cargando: boolean;
  filtros: FiltrosAuditoriaUI;
  onAplicarFiltros: (filtros: FiltrosAuditoriaUI) => void;
}

/** Tabla de solo lectura — sin ninguna acción de editar/eliminar por fila (append-only). */
export function TablaAuditoria({ registros, cargando, filtros, onAplicarFiltros }: Props) {
  const [borrador, setBorrador] = useState<FiltrosAuditoriaUI>(filtros);

  return (
    <div>
      <form
        onSubmit={(e) => { e.preventDefault(); onAplicarFiltros(borrador); }}
        className="mb-4 flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="mb-1 block text-body-xs text-dark-4 dark:text-dark-6">Usuario ID</label>
          <input
            value={borrador.usuarioId}
            onChange={(e) => setBorrador((f) => ({ ...f, usuarioId: e.target.value }))}
            placeholder="uuid del usuario"
            className="rounded-lg border border-stroke bg-white px-3 py-1.5 text-body-sm text-dark outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-body-xs text-dark-4 dark:text-dark-6">Acción</label>
          <select
            value={borrador.accion}
            onChange={(e) => setBorrador((f) => ({ ...f, accion: e.target.value }))}
            className="rounded-lg border border-stroke bg-white px-3 py-1.5 text-body-sm text-dark outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          >
            <option value="">Todas</option>
            {ACCIONES_CONOCIDAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-body-xs text-dark-4 dark:text-dark-6">Desde</label>
          <input
            type="date"
            value={borrador.desde}
            onChange={(e) => setBorrador((f) => ({ ...f, desde: e.target.value }))}
            className="rounded-lg border border-stroke bg-white px-3 py-1.5 text-body-sm text-dark outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-body-xs text-dark-4 dark:text-dark-6">Hasta</label>
          <input
            type="date"
            value={borrador.hasta}
            onChange={(e) => setBorrador((f) => ({ ...f, hasta: e.target.value }))}
            className="rounded-lg border border-stroke bg-white px-3 py-1.5 text-body-sm text-dark outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
        <button type="submit" className="rounded-lg bg-primary px-4 py-1.5 text-body-sm font-medium text-white hover:bg-opacity-90">
          Filtrar
        </button>
      </form>

      <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stroke dark:border-dark-3">
                {["Fecha", "Usuario", "Acción", "Entidad", "Detalle"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-body-sm text-dark-4 dark:text-dark-6">Cargando...</td></tr>
              ) : registros.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-body-sm text-dark-4 dark:text-dark-6">No hay eventos registrados.</td></tr>
              ) : (
                registros.map((r) => (
                  <tr key={r.id} className="border-b border-stroke last:border-0 dark:border-dark-3">
                    <td className="px-5 py-3 text-dark-4 dark:text-dark-6">{new Date(r.creadoEn).toLocaleString("es-CR")}</td>
                    <td className="px-5 py-3 text-dark-4 dark:text-dark-6">{r.usuarioId}</td>
                    <td className="px-5 py-3 font-medium text-dark dark:text-white">{r.accion}</td>
                    <td className="px-5 py-3 text-dark-4 dark:text-dark-6">{r.entidadTipo}</td>
                    <td className="px-5 py-3 text-dark-4 dark:text-dark-6">{r.entidadId}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
