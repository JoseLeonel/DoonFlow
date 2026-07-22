"use client";

import type { NodoArbol } from "@doonflow/shared";
import { cn } from "@doonflow/shared";

interface PropsRespuestaWidget {
  nodo: NodoArbol;
  valor?: string;
  valores?: string[];
  onChangeValor: (valor: string) => void;
  onChangeValores: (valores: string[]) => void;
}

/** Widget de respuesta según `tipoRespuesta` del nodo PREGUNTA (extraído del placeholder obsoleto `ejecutar/page.tsx`, adaptado a `NodoArbol`/`NodoOpcion`). */
export function RespuestaWidget({ nodo, valor, valores, onChangeValor, onChangeValores }: PropsRespuestaWidget) {
  switch (nodo.tipoRespuesta) {
    case "SI_NO":
      return (
        <div className="flex gap-3">
          {["SI", "NO"].map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => onChangeValor(opcion)}
              className={cn(
                "flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                valor === opcion
                  ? opcion === "SI"
                    ? "border-green-light-1 bg-green-light-7 text-green-dark dark:bg-green-dark/10"
                    : "border-red-light/50 bg-red-light/[0.08] text-red"
                  : "border-stroke bg-white text-dark-4 hover:border-stroke-dark dark:border-dark-3 dark:bg-dark-3 dark:text-dark-6",
              )}
            >
              {opcion === "SI" ? "✓  Sí" : "✗  No"}
            </button>
          ))}
        </div>
      );

    case "SELECCION_UNICA":
      return (
        <div className="flex flex-col gap-2">
          {nodo.opciones.map((op) => (
            <label key={op.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-stroke p-3 hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-3">
              <input
                type="radio"
                name={nodo.id}
                value={op.id}
                checked={valor === op.id}
                onChange={() => onChangeValor(op.id)}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-dark dark:text-white">{op.etiqueta}</span>
              {op.puntaje > 0 && <span className="ml-auto text-body-xs text-dark-4">{op.puntaje} pts</span>}
            </label>
          ))}
        </div>
      );

    case "SELECCION_MULTIPLE": {
      const seleccionados = valores ?? [];
      const toggle = (id: string) => {
        onChangeValores(seleccionados.includes(id) ? seleccionados.filter((v) => v !== id) : [...seleccionados, id]);
      };
      return (
        <div className="flex flex-col gap-2">
          {nodo.opciones.map((op) => (
            <label key={op.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-stroke p-3 hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-3">
              <input
                type="checkbox"
                checked={seleccionados.includes(op.id)}
                onChange={() => toggle(op.id)}
                className="h-4 w-4 rounded text-primary focus:ring-primary"
              />
              <span className="text-sm text-dark dark:text-white">{op.etiqueta}</span>
              {op.puntaje > 0 && <span className="ml-auto text-body-xs text-dark-4">{op.puntaje} pts</span>}
            </label>
          ))}
        </div>
      );
    }

    case "TEXTO_LIBRE":
      return (
        <textarea
          rows={2}
          value={valor ?? ""}
          onChange={(e) => onChangeValor(e.target.value)}
          placeholder="Ingrese su respuesta..."
          className="w-full resize-none rounded-lg border border-stroke bg-white px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />
      );

    case "NUMERICO":
      return (
        <input
          type="number"
          value={valor ?? ""}
          onChange={(e) => onChangeValor(e.target.value)}
          placeholder="0"
          className="w-32 rounded-lg border border-stroke bg-white px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />
      );

    case "PUNTAJE_MANUAL":
      return (
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={nodo.puntajeMaximo}
            value={valor ?? ""}
            onChange={(e) => onChangeValor(e.target.value)}
            className="w-28 rounded-lg border border-stroke bg-white px-4 py-2 text-center text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
          <span className="text-body-sm text-dark-4 dark:text-dark-6">/ {nodo.puntajeMaximo} pts</span>
        </div>
      );

    default:
      return (
        <input
          type="text"
          value={valor ?? ""}
          onChange={(e) => onChangeValor(e.target.value)}
          className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />
      );
  }
}
