"use client";

import { sumarPuntajes, contarPreguntas } from "@doonflow/shared";
import type { NodoArbol } from "@doonflow/shared";

interface PropsFilaSeccion {
  nodo: NodoArbol;
  colapsada: boolean;
  modoEdicion: boolean;
  onToggleColapso: (id: string) => void;
  onEditar: (nodo: NodoArbol) => void;
  onAgregarHijo: (padreId: string) => void;
  onSubir: (id: string) => void;
  onBajar: (id: string) => void;
  onEliminar: (id: string) => void;
}

export function FilaSeccion({
  nodo,
  colapsada,
  modoEdicion,
  onToggleColapso,
  onEditar,
  onAgregarHijo,
  onSubir,
  onBajar,
  onEliminar,
}: PropsFilaSeccion) {
  if (nodo.nivel === 0) {
    return (
      <FilaSeccionPrincipal
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
    );
  }
  return (
    <FilaGrupo
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
  );
}

// ── Sección nivel 0: barra verde gradient ─────────────────────────────────────

function FilaSeccionPrincipal({
  nodo,
  colapsada,
  modoEdicion,
  onToggleColapso,
  onEditar,
  onAgregarHijo,
  onSubir,
  onBajar,
  onEliminar,
}: PropsFilaSeccion) {
  const totalItems = contarPreguntas([nodo]);
  const totalPuntos = sumarPuntajes([nodo]);
  const tieneHijos = nodo.hijos.length > 0;

  return (
    <div
      role="treeitem"
      aria-expanded={!colapsada}
      aria-level={1}
      className="group"
      style={{
        background: "linear-gradient(180deg,#1a8a4c,#157a42)",
        borderRadius: 10,
        marginTop: 10,
        boxShadow: "0 1px 2px rgba(21,128,61,.25)",
        minHeight: 48,
      }}
    >
      <div className="flex items-center justify-between" style={{ padding: "10px 14px" }}>
        {/* Izquierda: chevron + código + título + contador */}
        <div className="flex items-center gap-2.5 min-w-0">
          {tieneHijos ? (
            <button
              onClick={() => onToggleColapso(nodo.id)}
              aria-label={colapsada ? `Expandir ${nodo.titulo}` : `Colapsar ${nodo.titulo}`}
              className="flex-shrink-0"
              style={{
                color: "rgba(255,255,255,.8)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  transform: colapsada ? "rotate(-90deg)" : "rotate(0deg)",
                  transition: "transform .12s",
                }}
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <span className="flex-shrink-0" style={{ width: 16 }} />
          )}

          {/* Badge código */}
          <span
            style={{
              background: "rgba(255,255,255,.2)",
              borderRadius: 6,
              padding: "1px 7px",
              fontSize: 12,
              fontFamily: '"Roboto Mono", monospace',
              fontWeight: 600,
              color: "#fff",
              whiteSpace: "nowrap",
            }}
          >
            {nodo.codigo}
          </span>

          {/* Título */}
          <span
            style={{
              fontSize: 14.5,
              fontWeight: 700,
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: ".3px",
            }}
          >
            {nodo.titulo}
          </span>

          {/* Contador */}
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.65)", whiteSpace: "nowrap" }}>
            {totalItems} {totalItems === 1 ? "ítem" : "ítems"}
          </span>
        </div>

        {/* Derecha: pill puntos + acciones */}
        <div className="flex flex-shrink-0 items-center gap-2 ml-2">
          <span
            style={{
              background: "rgba(255,255,255,.2)",
              borderRadius: 999,
              padding: "2px 10px",
              fontSize: 12.5,
              fontWeight: 600,
              color: "#fff",
              fontFamily: '"Roboto Mono", monospace',
              whiteSpace: "nowrap",
            }}
          >
            {totalPuntos} pts
          </span>

          {modoEdicion && (
            <div
              className="flex items-center gap-0.5"
              style={{ opacity: 0.35, transition: "opacity .12s" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = ".35")}
            >
              <AccionBtn
                label={`Agregar en ${nodo.titulo}`}
                onClick={() => onAgregarHijo(nodo.id)}
                color="rgba(255,255,255,.9)"
              >
                <IcoPlus />
              </AccionBtn>
              <AccionBtn
                label={`Editar ${nodo.titulo}`}
                onClick={() => onEditar(nodo)}
                color="rgba(255,255,255,.9)"
              >
                <IcoEditar />
              </AccionBtn>
              <AccionBtn
                label={`Subir ${nodo.titulo}`}
                onClick={() => onSubir(nodo.id)}
                color="rgba(255,255,255,.9)"
              >
                <IcoSubir />
              </AccionBtn>
              <AccionBtn
                label={`Bajar ${nodo.titulo}`}
                onClick={() => onBajar(nodo.id)}
                color="rgba(255,255,255,.9)"
              >
                <IcoBajar />
              </AccionBtn>
              <AccionBtn
                label={`Eliminar ${nodo.titulo}`}
                onClick={() => onEliminar(nodo.id)}
                color="rgba(255,255,255,.9)"
                hoverColor="#fca5a5"
              >
                <IcoEliminar />
              </AccionBtn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Grupo nivel 1+: fila con 4 columnas ──────────────────────────────────────

function FilaGrupo({
  nodo,
  colapsada,
  modoEdicion,
  onToggleColapso,
  onEditar,
  onAgregarHijo,
  onSubir,
  onBajar,
  onEliminar,
}: PropsFilaSeccion) {
  const totalItems = contarPreguntas([nodo]);
  const totalPuntos = sumarPuntajes([nodo]);
  const tieneHijos = nodo.hijos.length > 0;
  const esNivel1 = nodo.nivel === 1;
  const indentPx = 16 + (nodo.nivel - 1) * 22;

  return (
    <div
      role="treeitem"
      aria-expanded={!colapsada}
      aria-level={nodo.nivel + 1}
      className="group flex items-center"
      style={{
        minHeight: 44,
        background: esNivel1 ? "#f3f6fa" : "#f9fafc",
        borderBottom: "1px solid #f1f4f8",
      }}
    >
      {/* Columna ASPECTO · REQUERIMIENTO */}
      <div
        className="flex min-w-0 flex-1 items-center gap-2"
        style={{ paddingLeft: indentPx, paddingRight: 8, paddingTop: 8, paddingBottom: 8 }}
      >
        {tieneHijos ? (
          <button
            onClick={() => onToggleColapso(nodo.id)}
            aria-label={colapsada ? `Expandir ${nodo.titulo}` : `Colapsar ${nodo.titulo}`}
            className="flex-shrink-0"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              color: "#94a3b8",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{
                transform: colapsada ? "rotate(-90deg)" : "rotate(0deg)",
                transition: "transform .12s",
              }}
            >
              <path
                d="M3 5l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <span className="flex-shrink-0" style={{ width: 14 }} />
        )}

        {/* Código */}
        <span
          style={{
            fontSize: 11.5,
            fontFamily: '"Roboto Mono", monospace',
            fontWeight: 600,
            color: "#15803d",
            whiteSpace: "nowrap",
          }}
        >
          {nodo.codigo}
        </span>

        {/* Título */}
        <span
          style={{
            fontSize: esNivel1 ? 14 : 13,
            fontWeight: 600,
            color: "#1e293b",
          }}
        >
          {nodo.titulo}
        </span>

        {/* Contador */}
        <span
          style={{
            fontSize: 11.5,
            color: "#94a3b8",
            whiteSpace: "nowrap",
          }}
        >
          {totalItems} {totalItems === 1 ? "ítem" : "ítems"}
        </span>
      </div>

      {/* Columna CRITERIO (vacía para grupos) */}
      <div style={{ width: 172 }} />

      {/* Columna PUNTOS */}
      <div className="flex justify-center" style={{ width: 96 }}>
        <span
          style={{
            background: "#f1f5f9",
            borderRadius: 999,
            padding: "2px 10px",
            fontSize: 12,
            fontWeight: 600,
            color: "#475569",
            fontFamily: '"Roboto Mono", monospace',
          }}
        >
          {totalPuntos}
        </span>
      </div>

      {/* Columna ACCIONES */}
      <div
        className="flex items-center justify-end"
        style={{ width: 140, paddingRight: 12 }}
      >
        {modoEdicion && (
          <div
            className="flex items-center gap-0.5"
            style={{ opacity: 0.35, transition: "opacity .12s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = ".35")}
          >
            <AccionBtn
              label={`Agregar en ${nodo.titulo}`}
              onClick={() => onAgregarHijo(nodo.id)}
              hoverColor="#15803d"
            >
              <IcoPlus />
            </AccionBtn>
            <AccionBtn
              label={`Editar ${nodo.titulo}`}
              onClick={() => onEditar(nodo)}
            >
              <IcoEditar />
            </AccionBtn>
            <AccionBtn
              label={`Subir ${nodo.titulo}`}
              onClick={() => onSubir(nodo.id)}
            >
              <IcoSubir />
            </AccionBtn>
            <AccionBtn
              label={`Bajar ${nodo.titulo}`}
              onClick={() => onBajar(nodo.id)}
            >
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

// ── Íconos SVG ────────────────────────────────────────────────────────────────

const IcoPlus = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

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
    <path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IcoBajar = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 3v8M3 7l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IcoEliminar = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 4h10M5 4V2h4v2M5.5 7v4M8.5 7v4M3 4l.7 7.3A1 1 0 004.7 12h4.6a1 1 0 001-.7L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Botón de acción genérico ──────────────────────────────────────────────────

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
