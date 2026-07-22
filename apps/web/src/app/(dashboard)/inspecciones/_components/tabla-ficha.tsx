"use client";

import { useState } from "react";
import type { NodoArbol } from "@doonflow/shared";
import { FilaSeccion } from "./fila-seccion";
import { FilaPregunta } from "./fila-pregunta";

interface PropsTablaFicha {
  nodos: NodoArbol[];
  modoEdicion: boolean;
  seccionesColapsadas: Set<string>;
  onToggleColapso: (id: string) => void;
  onExpandirTodo: () => void;
  onContraerTodo: () => void;
  onEditar: (nodo: NodoArbol) => void;
  onAgregarHijo: (padreId: string) => void;
  onAgregarSeccion: () => void;
  onSubir: (id: string) => void;
  onBajar: (id: string) => void;
  onEliminar: (id: string) => void;
  onActualizarPuntaje: (nodoId: string, puntaje: number) => Promise<void>;
}

// Elimina acentos y pasa a minúsculas para comparación insensible a diacríticos
const DIACRITICOS = /[̀-ͯ]/g;
function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(DIACRITICOS, "");
}

function nodoTieneCoincidencia(nodo: NodoArbol, query: string): boolean {
  const q = normalizar(query);
  const coincide =
    normalizar(nodo.codigo).includes(q) || normalizar(nodo.titulo).includes(q);
  return coincide || nodo.hijos.some((h) => nodoTieneCoincidencia(h, q));
}

export function TablaFicha({
  nodos,
  modoEdicion,
  seccionesColapsadas,
  onToggleColapso,
  onExpandirTodo,
  onContraerTodo,
  onEditar,
  onAgregarHijo,
  onAgregarSeccion,
  onSubir,
  onBajar,
  onEliminar,
  onActualizarPuntaje,
}: PropsTablaFicha) {
  const [busqueda, setBusqueda] = useState("");
  const hayBusqueda = busqueda.trim().length >= 2;
  // Al buscar, forzar expansión de todo el árbol
  const seccionesEfectivas = hayBusqueda ? new Set<string>() : seccionesColapsadas;
  const nodosRaiz = hayBusqueda
    ? nodos.filter((n) => nodoTieneCoincidencia(n, busqueda))
    : nodos;

  if (nodos.length === 0) {
    return <EstadoVacio modoEdicion={modoEdicion} onAgregarSeccion={onAgregarSeccion} />;
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #e6eaf0",
        boxShadow: "0 1px 2px rgba(16,24,40,.04)",
        overflow: "hidden",
      }}
    >
      {/* Barra de herramientas */}
      <div
        className="flex flex-wrap items-center gap-2"
        style={{ padding: "14px 16px", borderBottom: "1px solid #eef1f5" }}
      >
        {/* Buscador */}
        <div className="relative" style={{ width: 280 }}>
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
          >
            <circle cx="6.5" cy="6.5" r="4.5" stroke="#94a3b8" strokeWidth="1.4" />
            <path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Buscar aspecto o requerimiento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: "100%",
              height: 38,
              paddingLeft: 32,
              paddingRight: 12,
              background: "#f6f8fb",
              border: "1px solid #e6eaf0",
              borderRadius: 9,
              fontSize: 13.5,
              color: "#334155",
              outline: "none",
            }}
          />
        </div>

        {/* Expandir / Contraer */}
        <BtnToolbar onClick={onExpandirTodo}>Expandir todo</BtnToolbar>
        <BtnToolbar onClick={onContraerTodo}>Contraer todo</BtnToolbar>

        {/* Leyenda */}
        <div className="ml-auto flex items-center gap-2">
          <PillSi />
          <PillNo />
          <span style={{ fontSize: 12.5, fontStyle: "italic", color: "#7c8aa0" }}>
            Puntaje manual
          </span>
        </div>
      </div>

      {/* Cabecera de columnas */}
      <div
        className="flex items-center"
        style={{
          background: "#fafbfc",
          borderBottom: "1px solid #eef1f5",
          padding: "0 16px",
        }}
      >
        <div style={thStyle({ flex: 1 })}>Aspecto · Requerimiento</div>
        <div style={thStyle({ width: 172 })}>Criterio</div>
        <div style={thStyle({ width: 96, textAlign: "center" })}>Puntos</div>
        <div style={thStyle({ width: 140, textAlign: "right" })}>Acciones</div>
      </div>

      {/* Cuerpo del árbol */}
      <div role="tree" style={{ padding: "6px 12px 8px" }}>
        {hayBusqueda && nodosRaiz.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 0",
              color: "#94a3b8",
              fontSize: 14,
            }}
          >
            Sin coincidencias para &ldquo;{busqueda}&rdquo;
          </div>
        ) : (
          nodosRaiz.map((nodo) => (
            <FilasNodo
              key={nodo.id}
              nodo={nodo}
              busqueda={busqueda}
              modoEdicion={modoEdicion}
              seccionesColapsadas={seccionesEfectivas}
              onToggleColapso={onToggleColapso}
              onEditar={onEditar}
              onAgregarHijo={onAgregarHijo}
              onSubir={onSubir}
              onBajar={onBajar}
              onEliminar={onEliminar}
              onActualizarPuntaje={onActualizarPuntaje}
            />
          ))
        )}
      </div>

      {/* Footer: Agregar sección */}
      {modoEdicion && (
        <div style={{ padding: "0 12px 14px" }}>
          <BtnAgregarDashed onClick={onAgregarSeccion}>+ Agregar sección</BtnAgregarDashed>
        </div>
      )}
    </div>
  );
}

// ── FilasNodo (componente interno recursivo) ──────────────────────────────────

function FilasNodo({
  nodo,
  busqueda,
  modoEdicion,
  seccionesColapsadas,
  onToggleColapso,
  onEditar,
  onAgregarHijo,
  onSubir,
  onBajar,
  onEliminar,
  onActualizarPuntaje,
}: {
  nodo: NodoArbol;
  busqueda: string;
  modoEdicion: boolean;
  seccionesColapsadas: Set<string>;
  onToggleColapso: (id: string) => void;
  onEditar: (nodo: NodoArbol) => void;
  onAgregarHijo: (padreId: string) => void;
  onSubir: (id: string) => void;
  onBajar: (id: string) => void;
  onEliminar: (id: string) => void;
  onActualizarPuntaje: (nodoId: string, puntaje: number) => Promise<void>;
}) {
  const colapsada = seccionesColapsadas.has(nodo.id);
  const hayBusqueda = busqueda.trim().length >= 2;

  if (nodo.tipo === "PREGUNTA") {
    if (hayBusqueda) {
      const q = normalizar(busqueda);
      const coincide =
        normalizar(nodo.codigo).includes(q) || normalizar(nodo.titulo).includes(q);
      if (!coincide) return null;
    }
    return (
      <FilaPregunta
        nodo={nodo}
        modoEdicion={modoEdicion}
        onEditar={onEditar}
        onSubir={onSubir}
        onBajar={onBajar}
        onEliminar={onEliminar}
        onActualizarPuntaje={onActualizarPuntaje}
      />
    );
  }

  // PANEL — sección o grupo
  const hijosFiltrados = hayBusqueda
    ? nodo.hijos.filter((h) => nodoTieneCoincidencia(h, busqueda))
    : nodo.hijos;

  return (
    <>
      <FilaSeccion
        nodo={nodo}
        colapsada={colapsada}
        modoEdicion={modoEdicion}
        onToggleColapso={onToggleColapso}
        onEditar={onEditar}
        onAgregarHijo={onAgregarHijo}
        onSubir={onSubir}
        onBajar={onBajar}
        onEliminar={onEliminar}
      />
      {!colapsada &&
        hijosFiltrados.map((hijo) => (
          <FilasNodo
            key={hijo.id}
            nodo={hijo}
            busqueda={busqueda}
            modoEdicion={modoEdicion}
            seccionesColapsadas={seccionesColapsadas}
            onToggleColapso={onToggleColapso}
            onEditar={onEditar}
            onAgregarHijo={onAgregarHijo}
            onSubir={onSubir}
            onBajar={onBajar}
            onEliminar={onEliminar}
            onActualizarPuntaje={onActualizarPuntaje}
          />
        ))}
      {/* Estado vacío de grupo en modo edición */}
      {!colapsada && modoEdicion && nodo.hijos.length === 0 && (
        <div style={{ padding: "4px 0 4px 32px" }}>
          <BtnAgregarDashed
            onClick={() => onAgregarHijo(nodo.id)}
            style={{ border: "1px dashed #cbd5e1", padding: "8px 0", fontSize: 13 }}
          >
            Agregar requerimiento
          </BtnAgregarDashed>
        </div>
      )}
    </>
  );
}

// ── Estado vacío global ───────────────────────────────────────────────────────

function EstadoVacio({
  modoEdicion,
  onAgregarSeccion,
}: {
  modoEdicion: boolean;
  onAgregarSeccion: () => void;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #e6eaf0",
        boxShadow: "0 1px 2px rgba(16,24,40,.04)",
      }}
    >
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 60,
            height: 60,
            background: "#f0fdf4",
            border: "1px solid #c5f0d6",
            color: "#15803d",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
            Esta ficha no tiene secciones todavía.
          </p>
          <p style={{ marginTop: 4, fontSize: 13.5, color: "#64748b" }}>
            Agrega la primera sección para comenzar a construir el formulario.
          </p>
        </div>
        {modoEdicion && (
          <button
            onClick={onAgregarSeccion}
            style={{
              padding: "9px 22px",
              borderRadius: 9,
              background: "#15803d",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(21,128,61,.35)",
            }}
          >
            + Agregar primera sección
          </button>
        )}
      </div>
    </div>
  );
}

// ── Componentes de utilería ───────────────────────────────────────────────────

function BtnToolbar({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 7,
        border: "1px solid #e2e8f0",
        background: "#fff",
        fontSize: 13,
        color: "#475569",
        cursor: "pointer",
        transition: "border-color .1s, color .1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#15803d";
        e.currentTarget.style.color = "#15803d";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e2e8f0";
        e.currentTarget.style.color = "#475569";
      }}
    >
      {children}
    </button>
  );
}

function BtnAgregarDashed({
  onClick,
  children,
  style,
}: {
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px 0",
        border: "1.5px dashed #cdd6e2",
        borderRadius: 9,
        background: "#fafbfd",
        fontSize: 13.5,
        color: "#475569",
        cursor: "pointer",
        transition: "border-color .12s, color .12s",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#15803d";
        e.currentTarget.style.color = "#15803d";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = style?.border ? "#cbd5e1" : "#cdd6e2";
        e.currentTarget.style.color = "#475569";
      }}
    >
      {children}
    </button>
  );
}

function PillSi() {
  return (
    <span
      style={{
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: "#15803d",
        border: "1px solid #bbf7d0",
        background: "#f0fdf4",
      }}
    >
      Sí
    </span>
  );
}

function PillNo() {
  return (
    <span
      style={{
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: "#b91c1c",
        border: "1px solid #fecaca",
        background: "#fef2f2",
      }}
    >
      No
    </span>
  );
}

function thStyle(extra: React.CSSProperties): React.CSSProperties {
  return {
    padding: "10px 0",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: ".6px",
    color: "#9aa6b6",
    textTransform: "uppercase",
    ...extra,
  };
}
