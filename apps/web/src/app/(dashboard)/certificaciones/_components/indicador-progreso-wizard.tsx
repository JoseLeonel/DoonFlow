"use client";

import { cn } from "@doonflow/shared";

export interface PasoIndicador {
  numero: number;
  titulo: string;
  visitado: boolean;
  completo: boolean;
}

interface PropsIndicadorProgresoWizard {
  pasos: PasoIndicador[];
  pasoActual: number;
  onIrAPaso: (numero: number) => void;
}

/** Stepper genérico y reutilizable, sin lógica de negocio (T-242) — decide si un paso es clicable el hook del wizard. */
export function IndicadorProgresoWizard({ pasos, pasoActual, onIrAPaso }: PropsIndicadorProgresoWizard) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto py-1">
      {pasos.map((paso, i) => {
        const esActual = paso.numero === pasoActual;
        const esClicable = paso.visitado;
        return (
          <li key={paso.numero} className="flex items-center gap-1">
            <button
              type="button"
              data-testid={`paso-${paso.numero}`}
              disabled={!esClicable}
              aria-current={esActual ? "step" : undefined}
              onClick={() => onIrAPaso(paso.numero)}
              title={paso.titulo}
              className={cn(
                "relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-body-xs font-bold transition-colors",
                esActual && "bg-primary text-white",
                !esActual && paso.completo && "bg-green-light-6 text-green-dark",
                !esActual && !paso.completo && paso.visitado && "bg-gray-2 text-dark-4 dark:bg-dark-3 dark:text-dark-6",
                !esActual && !paso.visitado && "cursor-not-allowed bg-gray-1 text-dark-5 dark:bg-dark-2 dark:text-dark-6",
                esClicable && !esActual && "cursor-pointer hover:opacity-80",
              )}
            >
              {paso.numero}
              {paso.completo && !esActual && (
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green text-white ring-2 ring-white dark:ring-gray-dark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} className="h-2 w-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </span>
              )}
            </button>
            {i < pasos.length - 1 && <span className="h-px w-4 flex-shrink-0 bg-stroke dark:bg-dark-3" />}
          </li>
        );
      })}
    </ol>
  );
}
