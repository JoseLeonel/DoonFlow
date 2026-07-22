"use client";

import { useRef, useState } from "react";
import type { NodoArbol } from "@doonflow/shared";
import { cn } from "@doonflow/shared";
import { IndicadorComentario, IndicadorEvidencia, IndicadorRequerida } from "../../inspecciones/_components/indicador-pregunta";
import { RespuestaWidget } from "./respuesta-widget";
import type { EvidenciaCertificacion } from "../_servicios/certificacion.servicio";

const ACCEPT_EVIDENCIA = ".jpg,.jpeg,.png,.heic,.pdf,.doc,.docx";

interface PropsPreguntaWizard {
  nodo: NodoArbol;
  numero: string;
  valor?: string;
  valores?: string[];
  comentario?: string;
  evidencias: EvidenciaCertificacion[];
  onChangeValor: (valor: string) => void;
  onChangeValores: (valores: string[]) => void;
  onChangeComentario: (comentario: string) => void;
  onSubirEvidencia: (archivo: File) => Promise<unknown>;
}

/** Fila de pregunta del wizard de respuesta (T-226/T-241) — widget de respuesta en vez de controles de edición de estructura. */
export function PreguntaWizard({
  nodo, numero, valor, valores, comentario, evidencias,
  onChangeValor, onChangeValores, onChangeComentario, onSubirEvidencia,
}: PropsPreguntaWizard) {
  const [mostrarComentario, setMostrarComentario] = useState(
    !!comentario || nodo.reglaComentario === "SIEMPRE" || (nodo.reglaComentario === "CUANDO_NEGATIVO" && valor === "NO"),
  );
  const [subiendo, setSubiendo] = useState(false);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const esRespondida = !!valor || (valores?.length ?? 0) > 0;
  const permiteEvidencia = nodo.evidenciaObligatoria || nodo.evidenciaMaxima > 0;

  const manejarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    try {
      await onSubirEvidencia(archivo);
    } finally {
      setSubiendo(false);
      if (inputArchivo.current) inputArchivo.current.value = "";
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        esRespondida
          ? "border-green-light-1/30 bg-green-light-7 dark:border-dark-3 dark:bg-dark-2"
          : "border-stroke bg-gray-1/50 dark:border-dark-3 dark:bg-dark-2",
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-1 items-start gap-2">
          <span className="mt-0.5 flex-shrink-0 text-body-xs font-bold text-primary">{numero}</span>
          <div>
            <p className="text-sm font-medium text-dark dark:text-white">{nodo.titulo}</p>
            {nodo.criterio && <p className="mt-0.5 text-body-xs text-dark-4 dark:text-dark-6">{nodo.criterio}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {nodo.evidenciaObligatoria && <IndicadorEvidencia obligatoria={nodo.evidenciaObligatoria} minima={nodo.evidenciaMinima} />}
          {nodo.reglaComentario === "SIEMPRE" && <IndicadorRequerida />}
          <IndicadorComentario regla={nodo.reglaComentario} />
        </div>
      </div>

      <RespuestaWidget
        nodo={nodo}
        valor={valor}
        valores={valores}
        onChangeValor={onChangeValor}
        onChangeValores={onChangeValores}
      />

      {!mostrarComentario && nodo.reglaComentario !== "NUNCA" && (
        <button
          type="button"
          onClick={() => setMostrarComentario(true)}
          className="mt-2 text-body-xs font-medium text-primary hover:underline"
        >
          + Agregar comentario
        </button>
      )}

      {mostrarComentario && (
        <div className="mt-3">
          <label className="mb-1 block text-body-xs font-medium text-dark-4 dark:text-dark-6">Comentario</label>
          <textarea
            rows={2}
            value={comentario ?? ""}
            onChange={(e) => onChangeComentario(e.target.value)}
            placeholder="Ingrese un comentario..."
            className="w-full resize-none rounded-lg border border-stroke bg-white px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
      )}

      {permiteEvidencia && (
        <div className="mt-3">
          <label className="mb-1 block text-body-xs font-medium text-dark-4 dark:text-dark-6">Evidencia</label>
          {evidencias.length > 0 && (
            <ul className="mb-2 flex flex-col gap-1">
              {evidencias.map((e) => (
                <li key={e.id}>
                  <a href={e.url} target="_blank" rel="noreferrer" className="text-body-xs text-primary hover:underline">
                    {e.nombre}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {esRespondida ? (
            <>
              <input ref={inputArchivo} type="file" accept={ACCEPT_EVIDENCIA} onChange={manejarArchivo} className="hidden" id={`evidencia-${nodo.id}`} />
              <label
                htmlFor={`evidencia-${nodo.id}`}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stroke px-3 py-1.5 text-body-xs font-medium text-dark-4 hover:border-primary hover:text-primary dark:border-dark-3 dark:text-dark-6"
              >
                {subiendo ? "Subiendo..." : "Adjuntar archivo"}
              </label>
            </>
          ) : (
            <p className="text-body-xs text-dark-4 dark:text-dark-6">Responda la pregunta para poder adjuntar evidencia.</p>
          )}
        </div>
      )}
    </div>
  );
}
