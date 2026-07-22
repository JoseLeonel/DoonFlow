"use client";

import type { Plantilla } from "@doonflow/shared";
import type { ModoEditor } from "../_hooks/usar-editor-plantilla";
import { BadgeEstadoAprobacion } from "./badge-estado-aprobacion";

const ETIQUETAS_TIPO: Record<string, string> = {
  MINISTERIO_SALUD: "Min. Salud",
  AUDITORIA_INTERNA: "Auditoría interna",
  CALIDAD: "Calidad",
  SEGURIDAD_OCUPACIONAL: "Seg. Ocupacional",
  SUPERVISION_OPERATIVA: "Supervisión",
  OTRO: "Otro",
};

interface PropsStrip {
  plantilla: Plantilla;
  puntajeAcumulado: number;
  totalPreguntas: number;
  totalSecciones: number;
  modo: ModoEditor;
  onToggleModo: () => void;
  onEditarCabecera: () => void;
  onToggleEstado: () => void;
  onEnviarRevision: () => void;
}

export function StripResumenPlantilla({
  plantilla,
  puntajeAcumulado,
  totalPreguntas,
  totalSecciones,
  modo,
  onToggleModo,
  onEditarCabecera,
  onToggleEstado,
  onEnviarRevision,
}: PropsStrip) {
  const tipoLabel = ETIQUETAS_TIPO[plantilla.tipo] ?? plantilla.tipo;
  const coincide = totalPreguntas > 0 && puntajeAcumulado === plantilla.puntajeMaximo;

  return (
    <div
      className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 bg-white"
      style={{
        padding: "18px 20px",
        borderRadius: 14,
        border: "1px solid #e6eaf0",
        boxShadow: "0 1px 2px rgba(16,24,40,.04)",
      }}
    >
      {/* Izquierda: Avatar BPM + identidad */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex flex-shrink-0 items-center justify-center"
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: "#ecfdf3",
            border: "1px solid #c5f0d6",
            fontSize: 17,
            fontWeight: 800,
            color: "#15803d",
            fontFamily: '"Roboto Mono", monospace',
            letterSpacing: ".5px",
          }}
        >
          BPM
        </div>
        <div className="min-w-0">
          <div
            className="truncate"
            style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}
          >
            {tipoLabel} · {plantilla.nombre}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <button
              onClick={onToggleEstado}
              className="flex items-center gap-1.5 transition-opacity hover:opacity-75"
              title={plantilla.activa ? "Clic para desactivar" : "Clic para activar"}
            >
              <span
                className="block rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: plantilla.activa ? "#16a34a" : "#dc2626",
                  boxShadow: plantilla.activa ? "0 0 0 3px #dcfce7" : "none",
                }}
              />
              <span style={{ color: "#64748b", fontSize: 12.5 }}>
                {plantilla.activa ? "Activa" : "Inactiva"}
              </span>
            </button>
            <span style={{ color: "#cbd5e1" }}>·</span>
            <span style={{ color: "#64748b", fontSize: 12.5 }}>
              {totalSecciones} {totalSecciones === 1 ? "sección" : "secciones"} · {totalPreguntas}{" "}
              {totalPreguntas === 1 ? "ítem" : "ítems"}
            </span>
            <span style={{ color: "#cbd5e1" }}>·</span>
            <BadgeEstadoAprobacion estado={plantilla.estadoAprobacion} comentarioResolucion={plantilla.comentarioResolucion} />
          </div>
        </div>
      </div>

      {/* Centro: Medidor de puntaje */}
      <div
        className="flex flex-col items-center"
        style={{
          background: "#f0fdf4",
          border: "1px solid #c5f0d6",
          borderRadius: 10,
          padding: "8px 18px",
          minWidth: 170,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#15803d",
            letterSpacing: ".6px",
            textTransform: "uppercase",
          }}
        >
          Puntaje configurado
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#14532d",
              fontFamily: '"Roboto Mono", monospace',
            }}
          >
            {puntajeAcumulado} / {plantilla.puntajeMaximo} pts
          </span>
          {coincide && (
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path
                d="M3 7.5l3 3 6-6"
                stroke="#16a34a"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Derecha: acciones de aprobación + toggle segmentado */}
      <div className="flex items-center gap-2">
        {plantilla.estadoAprobacion === "BORRADOR" && (
          <button
            onClick={onEnviarRevision}
            disabled={totalPreguntas === 0}
            title={totalPreguntas === 0 ? "La ficha no tiene preguntas todavía." : undefined}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 500,
              color: totalPreguntas === 0 ? "#94a3b8" : "#15803d",
              background: "transparent",
              border: `1px solid ${totalPreguntas === 0 ? "#e2e8f0" : "#15803d"}`,
              cursor: totalPreguntas === 0 ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Enviar a revisión
          </button>
        )}
        <div
          className="flex items-center"
          style={{ background: "#f1f5f9", borderRadius: 10, padding: 3 }}
        >
        <button
          onClick={onEditarCabecera}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: 500,
            color: modo === "edicion" ? "#475569" : "#475569",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            transition: "all .12s",
            whiteSpace: "nowrap",
          }}
        >
          Editar cabecera
        </button>
        <button
          onClick={onToggleModo}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: modo === "edicion" ? 600 : 500,
            color: modo === "edicion" ? "#fff" : "#475569",
            background: modo === "edicion" ? "#15803d" : "transparent",
            border: "none",
            cursor: "pointer",
            transition: "all .12s",
            whiteSpace: "nowrap",
          }}
        >
          {modo === "edicion" && (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M9 1.5l2.5 2.5L4 11.5H1.5V9L9 1.5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          Editando estructura
        </button>
        </div>
      </div>
    </div>
  );
}
