"use client";

import { useState } from "react";
import type { Apelacion } from "@doonflow/shared";
import { BadgeEstadoApelacion } from "./badge-estado-apelacion";

interface PropsPanelResolucionApelacion {
  apelacion: Apelacion;
  guardando: boolean;
  error: string | null;
  onResolver: (estado: "ACEPTADA" | "RECHAZADA", resolucionComentario: string) => void;
}

const ETIQUETA_TIPO: Record<Apelacion["tipo"], string> = {
  SOBRE_HALLAZGO: "Sobre un hallazgo específico",
  SOBRE_RESULTADO: "Sobre el resultado general",
};

export function PanelResolucionApelacion({ apelacion, guardando, error, onResolver }: PropsPanelResolucionApelacion) {
  const [comentario, setComentario] = useState("");
  const yaResuelta = apelacion.estado === "ACEPTADA" || apelacion.estado === "RECHAZADA";

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-heading-6 font-bold text-dark dark:text-white">{apelacion.inspeccionEtiqueta}</h1>
        <BadgeEstadoApelacion estado={apelacion.estado} />
      </div>

      <dl className="mb-4 space-y-2 text-body-sm">
        <div>
          <dt className="text-dark-4 dark:text-dark-6">Tipo</dt>
          <dd className="text-dark dark:text-white">{ETIQUETA_TIPO[apelacion.tipo]}</dd>
        </div>
        <div>
          <dt className="text-dark-4 dark:text-dark-6">Solicitado por</dt>
          <dd className="text-dark dark:text-white">{apelacion.solicitadoPorNombre}</dd>
        </div>
        <div>
          <dt className="text-dark-4 dark:text-dark-6">Motivo</dt>
          <dd className="text-dark dark:text-white">{apelacion.motivo}</dd>
        </div>
        {yaResuelta && (
          <div>
            <dt className="text-dark-4 dark:text-dark-6">Justificación de la resolución</dt>
            <dd className="text-dark dark:text-white">{apelacion.resolucionComentario}</dd>
          </div>
        )}
      </dl>

      {apelacion.estado === "ACEPTADA" && (
        <p className="mb-4 rounded-lg bg-green-light-4 px-4 py-2.5 text-body-sm text-green">
          Apelación aceptada.{" "}
          {apelacion.tipo === "SOBRE_HALLAZGO"
            ? "El hallazgo fue anulado y el resultado de la certificación se recalculó."
            : "Queda registrada como parte del historial de la certificación."}
        </p>
      )}
      {apelacion.estado === "RECHAZADA" && (
        <p className="mb-4 rounded-lg bg-gray-2 px-4 py-2.5 text-body-sm text-dark-4 dark:bg-dark-2 dark:text-dark-6">
          Apelación rechazada — el resultado original se mantiene sin cambios.
        </p>
      )}

      {yaResuelta ? null : (
        <>
          <hr className="mb-4 border-stroke dark:border-dark-3" />
          <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Justificación de la resolución *</label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            className="mb-4 w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
          />
          {error && <p className="mb-4 text-body-xs text-red">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={!comentario.trim() || guardando}
              onClick={() => onResolver("ACEPTADA", comentario.trim())}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aceptar apelación
            </button>
            <button
              type="button"
              disabled={!comentario.trim() || guardando}
              onClick={() => onResolver("RECHAZADA", comentario.trim())}
              className="rounded-lg border border-red px-6 py-2.5 text-sm font-medium text-red hover:bg-red-light-4 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Rechazar apelación
            </button>
          </div>
        </>
      )}
    </div>
  );
}
