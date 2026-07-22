"use client";

import { useMemo } from "react";
import type { NodoArbol } from "@doonflow/shared";
import { PreguntaWizard } from "./pregunta-wizard";
import type { DetalleCertificacion, EvidenciaCertificacion } from "../_servicios/certificacion.servicio";
import type { RespuestaLocal } from "../_hooks/usar-responder-certificacion";

interface PropsSeccionWizard {
  seccion: NodoArbol;
  respuestas: Record<string, RespuestaLocal>;
  detalles: DetalleCertificacion[];
  evidencias: EvidenciaCertificacion[];
  onChangeValor: (nodoId: string, valor: string) => void;
  onChangeValores: (nodoId: string, valores: string[]) => void;
  onChangeComentario: (nodoId: string, comentario: string) => void;
  /** `nodoId`, no `detalleId` — permite adjuntar evidencia offline antes de que exista un `InspeccionDetalle` real (012-captura-offline-campo). */
  onSubirEvidencia: (nodoId: string, archivo: File) => Promise<unknown>;
}

/** Renderiza el árbol completo de una sola sección de nivel 0 — nunca la plantilla entera (T-232). */
export function SeccionWizard({ seccion, respuestas, detalles, evidencias, ...handlers }: PropsSeccionWizard) {
  const mapaDetalle = useMemo(() => new Map(detalles.map((d) => [d.nodoId, d])), [detalles]);

  return (
    <div className="space-y-3">
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
  onChangeValor, onChangeValores, onChangeComentario, onSubirEvidencia,
}: {
  nodo: NodoArbol;
  numero: string;
  respuestas: Record<string, RespuestaLocal>;
  mapaDetalle: Map<string, DetalleCertificacion>;
  evidencias: EvidenciaCertificacion[];
  onChangeValor: (nodoId: string, valor: string) => void;
  onChangeValores: (nodoId: string, valores: string[]) => void;
  onChangeComentario: (nodoId: string, comentario: string) => void;
  onSubirEvidencia: (nodoId: string, archivo: File) => Promise<unknown>;
}) {
  if (nodo.tipo === "PANEL") {
    return (
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-dark-3 dark:text-dark-6">
          <span className="text-body-xs font-medium uppercase tracking-wider text-primary/70">{nodo.codigo}</span>
          {nodo.titulo}
        </h3>
        <div className="space-y-3 border-l border-stroke pl-3 dark:border-dark-3">
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
              onChangeComentario={onChangeComentario}
              onSubirEvidencia={onSubirEvidencia}
            />
          ))}
        </div>
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
      comentario={respuesta.comentario}
      evidencias={evidenciasNodo}
      onChangeValor={(v) => onChangeValor(nodo.id, v)}
      onChangeValores={(v) => onChangeValores(nodo.id, v)}
      onChangeComentario={(v) => onChangeComentario(nodo.id, v)}
      onSubirEvidencia={(archivo) => onSubirEvidencia(nodo.id, archivo)}
    />
  );
}
