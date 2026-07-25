"use client";

import { useState } from "react";
import type { HallazgoFrecuente, Severidad } from "@doonflow/shared";

interface PropsSelectorHallazgoFrecuente {
  items: HallazgoFrecuente[];
  cargando: boolean;
  onElegir: (item: { descripcion: string; severidad: Severidad }) => void;
  onCerrar: () => void;
}

/** 014-panel-calendario-biblioteca — precarga el formulario de hallazgo manual, editable (regla 3 de la spec). */
export function SelectorHallazgoFrecuente({ items, cargando, onElegir, onCerrar }: PropsSelectorHallazgoFrecuente) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = items.filter((i) => i.descripcionHallazgo.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/40" onClick={onCerrar}>
      <div
        className="w-full max-w-[480px] rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-body-lg font-semibold text-dark dark:text-white">Elegir hallazgo frecuente</h2>
          <button type="button" onClick={onCerrar} className="text-dark-4 hover:text-dark dark:text-dark-6 dark:hover:text-white">✕</button>
        </div>

        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar..."
          className="mb-4 w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
        />

        {cargando ? (
          <p className="py-6 text-center text-body-sm text-dark-4 dark:text-dark-6">Cargando...</p>
        ) : filtrados.length === 0 ? (
          <p className="py-6 text-center text-body-sm text-dark-4 dark:text-dark-6">No hay hallazgos frecuentes que coincidan.</p>
        ) : (
          <ul className="max-h-[320px] divide-y divide-stroke overflow-y-auto dark:divide-dark-3">
            {filtrados.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onElegir({ descripcion: item.descripcionHallazgo, severidad: item.severidadSugerida })}
                  className="flex w-full items-center justify-between gap-2 py-2.5 text-left hover:bg-gray-1 dark:hover:bg-dark-2"
                >
                  <span className="text-sm text-dark dark:text-white">{item.descripcionHallazgo}</span>
                  <span className="text-body-xs font-medium text-dark-4 dark:text-dark-6">{item.severidadSugerida}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
