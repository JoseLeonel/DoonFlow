"use client";

import * as React from "react";
import { cn } from "@doonflow/shared";
import { Boton } from "./boton";

export interface PropsDialogoConfirmacion {
  /** Controla si el diálogo está visible. */
  abierto: boolean;
  titulo: string;
  mensaje: string;
  /** Texto del botón principal (acción confirmada). */
  labelConfirmar?: string;
  /** Texto del botón secundario (cancelar / quedarse). */
  labelCancelar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Diálogo modal de confirmación genérico.
 * Sin lógica de dominio — recibe títulos, mensajes y callbacks por props.
 *
 * @example
 *   <DialogoConfirmacion
 *     abierto={mostrar}
 *     titulo="¿Salir sin guardar?"
 *     mensaje="Tienes cambios sin guardar. ¿Salir de todos modos?"
 *     labelConfirmar="Salir sin guardar"
 *     labelCancelar="Quedarse"
 *     onConfirmar={handleSalir}
 *     onCancelar={() => setMostrar(false)}
 *   />
 */
export function DialogoConfirmacion({
  abierto,
  titulo,
  mensaje,
  labelConfirmar = "Confirmar",
  labelCancelar = "Cancelar",
  onConfirmar,
  onCancelar,
}: PropsDialogoConfirmacion) {
  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialogo-titulo"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-dark/40"
        aria-hidden="true"
        onClick={onCancelar}
      />

      {/* Tarjeta */}
      <div className={cn(
        "relative z-10 w-full max-w-[420px] mx-4",
        "rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card",
        "p-6",
      )}>
        <h2
          id="dialogo-titulo"
          className="mb-2 text-heading-6 font-bold text-dark dark:text-white"
        >
          {titulo}
        </h2>
        <p className="mb-6 text-body-sm text-dark-4 dark:text-dark-6">{mensaje}</p>

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Boton variante="primario" onClick={onConfirmar} className="sm:w-auto px-6 py-2.5 text-sm">
            {labelConfirmar}
          </Boton>
          <Boton variante="secundario" onClick={onCancelar} className="sm:w-auto px-6 py-2.5 text-sm">
            {labelCancelar}
          </Boton>
        </div>
      </div>
    </div>
  );
}
