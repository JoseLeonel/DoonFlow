"use client";

import { useMemo, useState } from "react";
import { contarPreguntas, sumarPuntajes } from "@doonflow/shared";
import type { NodoArbol } from "@doonflow/shared";
import { PreguntaWizard } from "./pregunta-wizard";
import type { DetalleCertificacion, EvidenciaCertificacion } from "../_servicios/certificacion.servicio";
import type { RespuestaLocal } from "../_hooks/use-responder-certificacion";

interface PropsSeccionWizard {
  seccion: NodoArbol;
  respuestas: Record<string, RespuestaLocal>;
  detalles: DetalleCertificacion[];
  evidencias: EvidenciaCertificacion[];
  onChangeValor: (nodoId: string, valor: string) => void;
  onChangeValores: (nodoId: string, valores: string[]) => void;
  onChangeComentarioReconocimiento: (nodoId: string, comentario: string) => void;
  onChangeComentarioObservacion: (nodoId: string, comentario: string) => void;
  onChangeComentarioOportunidadMejora: (nodoId: string, comentario: string) => void;
  /** `nodoId`, no `detalleId` — permite adjuntar evidencia offline antes de que exista un `InspeccionDetalle` real (012-captura-offline-campo). */
  onSubirEvidencia: (nodoId: string, archivo: File) => Promise<unknown>;
}

/** Renderiza el árbol completo de una sola sección de nivel 0 — nunca la plantilla entera (T-232). */
export function SeccionWizard({ seccion, respuestas, detalles, evidencias, ...handlers }: PropsSeccionWizard) {
  const mapaDetalle = useMemo(() => new Map(detalles.map((d) => [d.nodoId, d])), [detalles]);

  return (
    <div className="space-y-2">
      {seccion.hijos.map((hijo, i) => (
        <NodoWizard
          key={hijo.id}
          nodo={hijo}
          numero={`${i + 1}`}
          respuestas={respuestas}
          mapaDetalle={mapaDetalle}
          evidencias={evidencias}
          {...handlers}
        />
      ))}
    </div>
  );
}

function NodoWizard({
  nodo, numero, respuestas, mapaDetalle, evidencias,
  onChangeValor, onChangeValores,
  onChangeComentarioReconocimiento, onChangeComentarioObservacion, onChangeComentarioOportunidadMejora,
  onSubirEvidencia,
}: {
  nodo: NodoArbol;
  numero: string;
  respuestas: Record<string, RespuestaLocal>;
  mapaDetalle: Map<string, DetalleCertificacion>;
  evidencias: EvidenciaCertificacion[];
  onChangeValor: (nodoId: string, valor: string) => void;
  onChangeValores: (nodoId: string, valores: string[]) => void;
  onChangeComentarioReconocimiento: (nodoId: string, comentario: string) => void;
  onChangeComentarioObservacion: (nodoId: string, comentario: string) => void;
  onChangeComentarioOportunidadMejora: (nodoId: string, comentario: string) => void;
  onSubirEvidencia: (nodoId: string, archivo: File) => Promise<unknown>;
}) {
  const [colapsado, setColapsado] = useState(false);

  if (nodo.tipo === "PANEL") {
    const totalItems = contarPreguntas([nodo]);
    const totalPuntos = sumarPuntajes([nodo]);
    const indentPx = (nodo.nivel - 1) * 18;

    return (
      <div>
        <button
          type="button"
          onClick={() => setColapsado((v) => !v)}
          aria-expanded={!colapsado}
          className="flex w-full items-center gap-2.5"
          style={{
            minHeight: 44,
            background: "linear-gradient(180deg,#1a8a4c,#157a42)",
            borderRadius: 10,
            boxShadow: "0 1px 2px rgba(21,128,61,.25)",
            marginLeft: indentPx,
            paddingLeft: 14,
            paddingRight: 14,
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0"
            style={{ transform: colapsado ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .12s", color: "rgba(255,255,255,.8)" }}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ background: "rgba(255,255,255,.2)", borderRadius: 6, padding: "1px 7px", fontSize: 12, fontFamily: '"Roboto Mono", monospace', fontWeight: 600, color: "#fff", whiteSpace: "nowrap" }}>
            {nodo.codigo}
          </span>
          <span style={{ fontSize: nodo.nivel === 1 ? 14.5 : 13.5, fontWeight: 700, color: "#fff", textTransform: nodo.nivel === 1 ? "uppercase" : "none", letterSpacing: ".3px" }}>
            {nodo.titulo}
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.65)", whiteSpace: "nowrap" }}>
            {totalItems} {totalItems === 1 ? "ítem" : "ítems"}
          </span>
          <span className="flex-1" />
          <span
            style={{
              background: "rgba(255,255,255,.2)", borderRadius: 999, padding: "2px 10px", fontSize: 12.5,
              fontWeight: 600, color: "#fff", fontFamily: '"Roboto Mono", monospace', whiteSpace: "nowrap",
            }}
          >
            {totalPuntos} pts
          </span>
        </button>

        {!colapsado && (
          <div className="mt-2 space-y-2 border-l border-stroke pl-3 dark:border-dark-3">
            {nodo.hijos.map((hijo, i) => (
              <NodoWizard
                key={hijo.id}
                nodo={hijo}
                numero={`${numero}.${i + 1}`}
                respuestas={respuestas}
                mapaDetalle={mapaDetalle}
                evidencias={evidencias}
                onChangeValor={onChangeValor}
                onChangeValores={onChangeValores}
                onChangeComentarioReconocimiento={onChangeComentarioReconocimiento}
                onChangeComentarioObservacion={onChangeComentarioObservacion}
                onChangeComentarioOportunidadMejora={onChangeComentarioOportunidadMejora}
                onSubirEvidencia={onSubirEvidencia}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const detalle = mapaDetalle.get(nodo.id);
  const respuesta = respuestas[nodo.id] ?? {};
  const evidenciasNodo = detalle ? evidencias.filter((e) => e.detalleId === detalle.id) : [];

  return (
    <PreguntaWizard
      nodo={nodo}
      numero={numero}
      valor={respuesta.valor}
      valores={respuesta.valores}
      comentarioReconocimiento={respuesta.comentarioReconocimiento}
      comentarioObservacion={respuesta.comentarioObservacion}
      comentarioOportunidadMejora={respuesta.comentarioOportunidadMejora}
      evidencias={evidenciasNodo}
      onChangeValor={(v) => onChangeValor(nodo.id, v)}
      onChangeValores={(v) => onChangeValores(nodo.id, v)}
      onChangeComentarioReconocimiento={(v) => onChangeComentarioReconocimiento(nodo.id, v)}
      onChangeComentarioObservacion={(v) => onChangeComentarioObservacion(nodo.id, v)}
      onChangeComentarioOportunidadMejora={(v) => onChangeComentarioOportunidadMejora(nodo.id, v)}
      onSubirEvidencia={(archivo) => onSubirEvidencia(nodo.id, archivo)}
    />
  );
}
