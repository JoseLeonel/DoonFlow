"use client";

import { useState } from "react";
import { cn } from "@doonflow/shared";
import { Boton } from "@doonflow/ui";

interface PropsDialogoRechazoPlantilla {
  abierto: boolean;
  nombrePlantilla: string;
  onRechazar: (comentario: string) => void;
  onCancelar: () => void;
}

/** Diálogo de rechazo — compuesto sobre el mismo lenguaje visual de `DialogoConfirmacion` (packages/ui), con un textarea obligatorio. */
export function DialogoRechazoPlantilla({ abierto, nombrePlantilla, onRechazar, onCancelar }: PropsDialogoRechazoPlantilla) {
  const [comentario, setComentario] = useState("");

  if (!abierto) return null;

  const confirmar = () => {
    if (!comentario.trim()) return;
    onRechazar(comentario);
    setComentario("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="dialogo-rechazo-titulo">
      <div className="absolute inset-0 bg-dark/40" aria-hidden="true" onClick={onCancelar} />

      <div className={cn("relative z-10 mx-4 w-full max-w-[420px]", "rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card", "p-6")}>
        <h2 id="dialogo-rechazo-titulo" className="mb-2 text-heading-6 font-bold text-dark dark:text-white">
          Rechazar plantilla
        </h2>
        <p className="mb-4 text-body-sm text-dark-4 dark:text-dark-6">
          ¿Por qué se rechaza <strong>{nombrePlantilla}</strong>?
        </p>

        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={3}
          placeholder="Ingrese el motivo del rechazo..."
          className="mb-6 w-full resize-none rounded-lg border border-stroke bg-white px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Boton variante="primario" onClick={confirmar} disabled={!comentario.trim()} className="sm:w-auto px-6 py-2.5 text-sm">
            Rechazar
          </Boton>
          <Boton variante="secundario" onClick={onCancelar} className="sm:w-auto px-6 py-2.5 text-sm">
            Cancelar
          </Boton>
        </div>
      </div>
    </div>
  );
}
