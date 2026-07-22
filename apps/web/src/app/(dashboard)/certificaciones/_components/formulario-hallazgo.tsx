"use client";

import { useState } from "react";
import type { Severidad } from "@doonflow/shared";

interface PropsFormularioHallazgo {
  onCrear: (datos: { descripcion: string; severidad: Severidad; archivo?: File }) => Promise<void>;
  onCancelar: () => void;
}

const OPCIONES_SEVERIDAD: Severidad[] = ["CRITICA", "MAYOR", "MENOR"];

export function FormularioHallazgo({ onCrear, onCancelar }: PropsFormularioHallazgo) {
  const [descripcion, setDescripcion] = useState("");
  const [severidad, setSeveridad] = useState<Severidad>("MENOR");
  const [archivo, setArchivo] = useState<File | undefined>(undefined);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      await onCrear({ descripcion: descripcion.trim(), severidad, archivo });
      setDescripcion("");
      setArchivo(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el hallazgo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="mb-4 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="mb-3">
        <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Descripción</label>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej. Extintor vencido en planta"
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
        />
      </div>
      <div className="mb-3">
        <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Severidad</label>
        <select
          value={severidad}
          onChange={(e) => setSeveridad(e.target.value as Severidad)}
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
        >
          {OPCIONES_SEVERIDAD.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Evidencia (opcional)</label>
        <input
          type="file"
          onChange={(e) => setArchivo(e.target.files?.[0])}
          className="w-full text-sm text-dark-4 dark:text-dark-6"
        />
      </div>
      {error && <p className="mb-3 text-body-xs text-red">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="rounded-lg border border-stroke px-4 py-2 text-sm text-dark dark:border-dark-3 dark:text-white">
          Cancelar
        </button>
        <button type="submit" disabled={enviando} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50">
          {enviando ? "Agregando..." : "Agregar hallazgo"}
        </button>
      </div>
    </form>
  );
}
