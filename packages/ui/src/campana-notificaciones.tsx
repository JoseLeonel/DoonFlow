"use client";

import * as React from "react";

function IconoCampana({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );
}

export interface PropsCampanaNotificaciones {
  /** Cantidad de notificaciones no leídas. Oculta el badge si es 0. */
  contador: number;
  /** Controla si el dropdown está abierto. */
  abierto: boolean;
  onToggle: () => void;
  /** Contenido del dropdown (lo trae `usar-notificaciones.ts`, este componente no tiene lógica de datos propia). */
  children?: React.ReactNode;
}

/** Ícono de campana con badge de contador — sin lógica de datos propia, componente controlado. */
export function CampanaNotificaciones({ contador, abierto, onToggle, children }: PropsCampanaNotificaciones) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Notificaciones"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-dark-4 transition-colors hover:bg-gray-1 hover:text-dark dark:text-dark-6 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <IconoCampana className="h-5 w-5" />
        {contador > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[10px] font-semibold leading-none text-white">
            {contador > 9 ? "9+" : contador}
          </span>
        )}
      </button>

      {abierto && children}
    </div>
  );
}
