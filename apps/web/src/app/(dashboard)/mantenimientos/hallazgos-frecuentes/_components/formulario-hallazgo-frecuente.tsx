"use client";

import { useState } from "react";
import type { SeveridadSugerida } from "../_servicios/hallazgo-frecuente.servicio";

interface PropsFormularioHallazgoFrecuente {
  valoresIniciales?: { descripcionHallazgo: string; severidadSugerida: SeveridadSugerida; descripcionAccionSugerida: string | null };
  onGuardar: (datos: { descripcionHallazgo: string; severidadSugerida: SeveridadSugerida; descripcionAccionSugerida: string | null }) => Promise<void>;
}

const OPCIONES_SEVERIDAD: SeveridadSugerida[] = ["CRITICA", "MAYOR", "MENOR"];

export function FormularioHallazgoFrecuente({ valoresIniciales, onGuardar }: PropsFormularioHallazgoFrecuente) {
  const [descripcionHallazgo, setDescripcionHallazgo] = useState(valoresIniciales?.descripcionHallazgo ?? "");
  const [severidadSugerida, setSeveridadSugerida] = useState<SeveridadSugerida>(valoresIniciales?.severidadSugerida ?? "MENOR");
  const [descripcionAccionSugerida, setDescripcionAccionSugerida] = useState(valoresIniciales?.descripcionAccionSugerida ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcionHallazgo.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      await onGuardar({
        descripcionHallazgo: descripcionHallazgo.trim(),
        severidadSugerida,
        descripcionAccionSugerida: descripcionAccionSugerida.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el hallazgo frecuente.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="mb-4">
        <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Descripción del hallazgo *</label>
        <input
          type="text"
          value={descripcionHallazgo}
          onChange={(e) => setDescripcionHallazgo(e.target.value)}
          placeholder="Ej. Extintor vencido"
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Severidad sugerida *</label>
        <select
          value={severidadSugerida}
          onChange={(e) => setSeveridadSugerida(e.target.value as SeveridadSugerida)}
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
        >
          {OPCIONES_SEVERIDAD.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Acción correctiva sugerida</label>
        <textarea
          value={descripcionAccionSugerida}
          onChange={(e) => setDescripcionAccionSugerida(e.target.value)}
          placeholder="Ej. Sustituir el extintor"
          rows={3}
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
        />
      </div>

      {error && <p className="mb-4 text-body-xs text-red">{error}</p>}

      <button
        type="submit"
        disabled={guardando || !descripcionHallazgo.trim()}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
