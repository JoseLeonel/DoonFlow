"use client";

import { useState } from "react";
import type { ApiKeyCreada } from "../_servicios/api-key.servicio";

interface PropsModalNuevaApiKey {
  onGenerar: (nombre: string) => Promise<ApiKeyCreada>;
  onCerrar: () => void;
}

/** Modal de 2 pasos: formulario → clave generada (visible una sola vez, regla 3 de la spec). */
export function ModalNuevaApiKey({ onGenerar, onCerrar }: PropsModalNuevaApiKey) {
  const [nombre, setNombre] = useState("");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creada, setCreada] = useState<ApiKeyCreada | null>(null);
  const [copiada, setCopiada] = useState(false);

  const generar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGenerando(true);
    setError(null);
    try {
      setCreada(await onGenerar(nombre.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la clave.");
    } finally {
      setGenerando(false);
    }
  };

  const copiar = async () => {
    if (!creada) return;
    await navigator.clipboard.writeText(creada.clave);
    setCopiada(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/40">
      <div className="w-full max-w-[480px] rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
        {!creada ? (
          <form onSubmit={generar}>
            <h2 className="mb-4 text-body-lg font-semibold text-dark dark:text-white">Generar nueva clave</h2>
            <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Nombre *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. ERP Cliente XYZ"
              className="mb-3 w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
            />
            {error && <p className="mb-3 text-body-xs text-red">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onCerrar} className="rounded-lg border border-stroke px-4 py-2 text-sm text-dark dark:border-dark-3 dark:text-white">
                Cancelar
              </button>
              <button type="submit" disabled={generando || !nombre.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50">
                {generando ? "Generando..." : "Generar clave"}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <h2 className="mb-2 text-body-lg font-semibold text-dark dark:text-white">Clave generada</h2>
            <p className="mb-3 text-body-xs text-red">
              ⚠ Copia esta clave ahora — no se volverá a mostrar en texto plano.
            </p>
            <div className="mb-3 break-all rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 font-mono text-body-xs text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white">
              {creada.clave}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={copiar} className="rounded-lg border border-stroke px-4 py-2 text-sm text-dark dark:border-dark-3 dark:text-white">
                {copiada ? "¡Copiada!" : "Copiar"}
              </button>
              <button type="button" onClick={onCerrar} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">
                Listo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
