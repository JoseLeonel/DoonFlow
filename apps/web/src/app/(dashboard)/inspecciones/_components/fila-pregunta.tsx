"use client";

import { useEffect, useState } from "react";
import type { NodoArbol } from "@doonflow/shared";

interface PropsFilaPregunta {
  nodo: NodoArbol;
  modoEdicion: boolean;
  onEditar: (nodo: NodoArbol) => void;
  onSubir: (id: string) => void;
  onBajar: (id: string) => void;
  onEliminar: (id: string) => void;
  onActualizarPuntaje: (nodoId: string, puntaje: number) => Promise<void>;
}

export function FilaPregunta({
  nodo,
  modoEdicion,
  onEditar,
  onSubir,
  onBajar,
  onEliminar,
  onActualizarPuntaje,
}: PropsFilaPregunta) {
  const indentPx = 16 + (nodo.nivel - 1) * 22;

  return (
    <div
      role="treeitem"
      aria-level={nodo.nivel + 1}
      className="group flex items-center"
      style={{
        minHeight: 50,
        background: "#fff",
        borderBottom: "1px solid #f4f6f9",
      }}
    >
      {/* Columna ASPECTO · REQUERIMIENTO */}
      <div
        className="flex min-w-0 flex-1 flex-col justify-center"
        style={{ paddingLeft: indentPx, paddingRight: 8, paddingTop: 10, paddingBottom: 10 }}
      >
        {/* Código */}
        <span
          style={{
            fontSize: 11.5,
            fontFamily: '"Roboto Mono", monospace',
            fontWeight: 600,
            color: "#16a34a",
          }}
        >
          {nodo.codigo}
        </span>
        {/* Título */}
        <span style={{ fontSize: 13.5, color: "#334155", textWrap: "pretty" as "pretty" }}>
          {nodo.titulo}
        </span>
        {/* Opciones (si las hay) */}
        {nodo.opciones.length > 0 && (
          <ul className="mt-1 list-none space-y-0.5">
            {nodo.opciones.map((op, idx) => (
              <li key={op.id} className="flex items-start gap-1">
                <span style={{ fontSize: 12, color: "#94a3b8", flexShrink: 0 }}>
                  {String.fromCharCode(97 + idx)})
                </span>
                <span style={{ fontSize: 12, color: "#64748b" }}>{op.etiqueta}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Columna CRITERIO */}
      <div
        className="flex items-center"
        style={{ width: 172, paddingRight: 8 }}
      >
        <CriterioDisplay nodo={nodo} />
      </div>

      {/* Columna PUNTOS */}
      <div className="flex items-center justify-center" style={{ width: 96 }}>
        <Stepper
          valor={nodo.puntajeMaximo}
          modoEdicion={modoEdicion}
          onChange={(v) => onActualizarPuntaje(nodo.id, v)}
        />
      </div>

      {/* Columna ACCIONES */}
      <div className="flex items-center justify-end" style={{ width: 140, paddingRight: 12 }}>
        {modoEdicion && (
          <div
            className="flex items-center gap-0.5"
            style={{ opacity: 0.35, transition: "opacity .12s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = ".35")}
          >
            <AccionBtn label={`Editar ${nodo.titulo}`} onClick={() => onEditar(nodo)}>
              <IcoEditar />
            </AccionBtn>
            <AccionBtn label={`Subir ${nodo.titulo}`} onClick={() => onSubir(nodo.id)}>
              <IcoSubir />
            </AccionBtn>
            <AccionBtn label={`Bajar ${nodo.titulo}`} onClick={() => onBajar(nodo.id)}>
              <IcoBajar />
            </AccionBtn>
            <AccionBtn
              label={`Eliminar ${nodo.titulo}`}
              onClick={() => onEliminar(nodo.id)}
              hoverColor="#dc2626"
            >
              <IcoEliminar />
            </AccionBtn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Criterio ──────────────────────────────────────────────────────────────────

function CriterioDisplay({ nodo }: { nodo: NodoArbol }) {
  if (nodo.tipoRespuesta === "SI_NO") {
    return (
      <span className="inline-flex gap-1.5">
        <PillCriterio color="#15803d" border="#bbf7d0" bg="#f0fdf4">Sí</PillCriterio>
        <PillCriterio color="#b91c1c" border="#fecaca" bg="#fef2f2">No</PillCriterio>
      </span>
    );
  }

  if (nodo.tipoRespuesta === "PUNTAJE_MANUAL" || nodo.modalidadPuntaje === "MANUAL") {
    return (
      <span style={{ fontSize: 12.5, fontStyle: "italic", color: "#7c8aa0" }}>
        Puntaje manual
      </span>
    );
  }

  if (nodo.criterio) {
    return <span style={{ fontSize: 13, color: "#475569" }}>{nodo.criterio}</span>;
  }

  if (nodo.tipoRespuesta) {
    const etiquetas: Record<string, string> = {
      SELECCION_UNICA: "Selección única",
      SELECCION_MULTIPLE: "Selección múltiple",
      TEXTO_LIBRE: "Texto libre",
      NUMERICO: "Numérico",
    };
    return (
      <span style={{ fontSize: 12.5, fontStyle: "italic", color: "#7c8aa0" }}>
        {etiquetas[nodo.tipoRespuesta] ?? nodo.tipoRespuesta}
      </span>
    );
  }

  return <span style={{ color: "#cbd5e1", fontSize: 13 }}>—</span>;
}

function PillCriterio({
  color,
  border,
  bg,
  children,
}: {
  color: string;
  border: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        padding: "2px 9px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color,
        border: `1px solid ${border}`,
        background: bg,
      }}
    >
      {children}
    </span>
  );
}

// ── Stepper de puntos ─────────────────────────────────────────────────────────

function Stepper({
  valor,
  modoEdicion,
  onChange,
}: {
  valor: number;
  modoEdicion: boolean;
  onChange: (v: number) => void;
}) {
  const [local, setLocal] = useState(valor);

  useEffect(() => {
    setLocal(valor);
  }, [valor]);

  if (!modoEdicion) {
    return (
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#0f172a",
          fontFamily: '"Roboto Mono", monospace',
        }}
      >
        {valor}
      </span>
    );
  }

  const dec = () => {
    const v = Math.max(0, local - 1);
    setLocal(v);
    onChange(v);
  };
  const inc = () => {
    const v = local + 1;
    setLocal(v);
    onChange(v);
  };

  return (
    <div
      className="flex items-center overflow-hidden"
      style={{ border: "1px solid #e2e8f0", borderRadius: 8, height: 30 }}
    >
      <BtnStep onClick={dec} label="Restar punto" borderSide="right">−</BtnStep>
      <span
        style={{
          width: 32,
          textAlign: "center",
          fontSize: 13,
          fontWeight: 700,
          color: "#0f172a",
          fontFamily: '"Roboto Mono", monospace',
          userSelect: "none",
        }}
      >
        {local}
      </span>
      <BtnStep onClick={inc} label="Sumar punto" borderSide="left">+</BtnStep>
    </div>
  );
}

function BtnStep({
  onClick,
  label,
  children,
  borderSide,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  borderSide: "left" | "right";
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 26,
        height: "100%",
        background: "#f8fafc",
        border: "none",
        borderRight: borderSide === "right" ? "1px solid #e2e8f0" : undefined,
        borderLeft: borderSide === "left" ? "1px solid #e2e8f0" : undefined,
        cursor: "pointer",
        fontSize: 15,
        color: "#475569",
        lineHeight: 1,
        transition: "background .1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#eef2f7")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
    >
      {children}
    </button>
  );
}

// ── Íconos ────────────────────────────────────────────────────────────────────

const IcoEditar = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M9.5 1.5l3 3L4 13H1v-3L9.5 1.5z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IcoSubir = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M7 11V3M3 7l4-4 4 4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IcoBajar = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M7 3v8M3 7l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IcoEliminar = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M2 4h10M5 4V2h4v2M5.5 7v4M8.5 7v4M3 4l.7 7.3A1 1 0 004.7 12h4.6a1 1 0 001-.7L11 4"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function AccionBtn({
  label,
  onClick,
  children,
  color = "#64748b",
  hoverColor = "#475569",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
  hoverColor?: string;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        borderRadius: 5,
        border: "none",
        background: "none",
        cursor: "pointer",
        color,
        transition: "color .1s, background .1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = hoverColor;
        e.currentTarget.style.background = "rgba(0,0,0,.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = color;
        e.currentTarget.style.background = "none";
      }}
    >
      {children}
    </button>
  );
}
