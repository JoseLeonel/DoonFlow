"use client";

import { useState } from "react";
import type { AccionCorrectiva } from "@doonflow/shared";

interface PropsPanelVerificacionAccion {
  accion: AccionCorrectiva;
  onVerificar: (resultado: "CUMPLIDO" | "NO_CUMPLIDO", comentario: string, nuevaFechaLimite?: string) => Promise<void>;
}

export function PanelVerificacionAccion({ accion, onVerificar }: PropsPanelVerificacionAccion) {
  const [comentario, setComentario] = useState("");
  const [nuevaFechaLimite, setNuevaFechaLimite] = useState("");
  const [resultadoPendiente, setResultadoPendiente] = useState<"CUMPLIDO" | "NO_CUMPLIDO" | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmar = async (resultado: "CUMPLIDO" | "NO_CUMPLIDO") => {
    if (!comentario.trim()) {
      setResultadoPendiente(resultado);
      setError("El comentario de verificación es requerido.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await onVerificar(resultado, comentario.trim(), resultado === "NO_CUMPLIDO" ? nuevaFechaLimite || undefined : undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo verificar la acción.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <h3 className="mb-3 text-body-sm font-semibold text-dark dark:text-white">Evidencias cargadas</h3>
      <ul className="mb-4 space-y-1">
        {accion.evidencias.length === 0 && <li className="text-body-xs text-dark-4 dark:text-dark-6">Sin evidencias.</li>}
        {accion.evidencias.map((e) => (
          <li key={e.id}>
            <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-body-xs text-primary hover:underline">
              {e.nombre}
            </a>
          </li>
        ))}
      </ul>

      <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Comentario de verificación *</label>
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        className="mb-3 w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
        rows={3}
      />

      {resultadoPendiente === "NO_CUMPLIDO" && (
        <div className="mb-3">
          <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Nueva fecha límite</label>
          <input
            type="date"
            value={nuevaFechaLimite}
            onChange={(e) => setNuevaFechaLimite(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
          />
        </div>
      )}

      {error && <p className="mb-3 text-body-xs text-red">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={enviando}
          onClick={() => confirmar("CUMPLIDO")}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          ✓ Marcar cumplido
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={() => confirmar("NO_CUMPLIDO")}
          className="rounded-lg border border-red px-4 py-2 text-sm font-medium text-red hover:bg-red-light-4 disabled:opacity-50"
        >
          ✗ Marcar no cumplido
        </button>
      </div>
    </div>
  );
}
