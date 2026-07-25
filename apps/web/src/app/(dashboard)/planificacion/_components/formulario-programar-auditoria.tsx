"use client";

import { useState } from "react";
import type { SucursalParaFiltro } from "../_servicios/plan-auditoria.servicio";

interface PropsFormularioProgramarAuditoria {
  sucursales: SucursalParaFiltro[];
  onGuardar: (datos: { sucursalId: string; fechaObjetivo: string; responsableSugeridoId?: string }) => Promise<void>;
  onCancelar: () => void;
}

export function FormularioProgramarAuditoria({ sucursales, onGuardar, onCancelar }: PropsFormularioProgramarAuditoria) {
  const [sucursalId, setSucursalId] = useState("");
  const [fechaObjetivo, setFechaObjetivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sucursalId || !fechaObjetivo) return;
    setGuardando(true);
    setError(null);
    try {
      await onGuardar({ sucursalId, fechaObjetivo });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo programar la auditoría.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="mb-4 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="mb-3">
        <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Sucursal *</label>
        <select
          value={sucursalId}
          onChange={(e) => setSucursalId(e.target.value)}
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
        >
          <option value="">Selecciona una sucursal</option>
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Fecha objetivo *</label>
        <input
          type="date"
          value={fechaObjetivo}
          onChange={(e) => setFechaObjetivo(e.target.value)}
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
        />
      </div>

      {error && <p className="mb-3 text-body-xs text-red">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="rounded-lg border border-stroke px-4 py-2 text-sm text-dark dark:border-dark-3 dark:text-white">
          Cancelar
        </button>
        <button type="submit" disabled={guardando || !sucursalId || !fechaObjetivo} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50">
          {guardando ? "Programando..." : "Programar certificación"}
        </button>
      </div>
    </form>
  );
}
