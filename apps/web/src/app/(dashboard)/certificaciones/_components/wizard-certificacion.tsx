"use client";

import type { ReactNode } from "react";
import { IndicadorProgresoWizard } from "./indicador-progreso-wizard";
import type { PasoIndicador } from "./indicador-progreso-wizard";

interface PropsWizardCertificacion {
  totalPasos: number;
  pasoActual: number;
  pasosVisitados: Set<number>;
  esUltimoPaso: boolean;
  guardando: boolean;
  titulosSecciones: string[];
  seccionesCompletas: boolean[];
  onAnterior: () => void;
  onSiguiente: () => void;
  onIrAPaso: (numero: number) => void;
  children: ReactNode;
}

/** Shell del wizard: barra de progreso fija, título de la sección actual y botones Anterior/Siguiente (T-241). */
export function WizardCertificacion({
  totalPasos, pasoActual, pasosVisitados, esUltimoPaso, guardando,
  titulosSecciones, seccionesCompletas, onAnterior, onSiguiente, onIrAPaso, children,
}: PropsWizardCertificacion) {
  const pasos: PasoIndicador[] = titulosSecciones.map((titulo, i) => ({
    numero: i + 1,
    titulo,
    visitado: pasosVisitados.has(i + 1) || i + 1 === pasoActual,
    completo: seccionesCompletas[i] ?? false,
  }));

  const tituloActual = titulosSecciones[pasoActual - 1] ?? "";

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="sticky top-0 z-10 mb-6 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark dark:shadow-card">
        <p className="mb-2 text-body-xs font-medium text-dark-4 dark:text-dark-6">
          Paso {pasoActual} de {totalPasos} · {tituloActual}
        </p>
        <IndicadorProgresoWizard pasos={pasos} pasoActual={pasoActual} onIrAPaso={onIrAPaso} />
      </div>

      <div className="mb-6 rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
        {children}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onAnterior}
          disabled={pasoActual === 1}
          className="rounded-lg border border-stroke px-6 py-2.5 text-sm font-medium text-dark-4 disabled:opacity-40 dark:border-dark-3 dark:text-dark-6"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={onSiguiente}
          disabled={guardando}
          className="rounded-lg bg-primary px-8 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          {guardando ? "Guardando..." : esUltimoPaso ? "Continuar a revisión" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
