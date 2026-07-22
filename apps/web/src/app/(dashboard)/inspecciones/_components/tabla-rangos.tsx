"use client";

import { useState } from "react";
import { validarRangos } from "@doonflow/shared";
import type { RangoResultado } from "@doonflow/shared";

type RangoEditable = Omit<RangoResultado, "id"> & { _id: string };

const COLORES_DISPONIBLES = [
  { label: "Verde", value: "green", hex: "#16a34a" },
  { label: "Amarillo", value: "yellow-dark", hex: "#eab308" },
  { label: "Naranja", value: "naranja", hex: "#f59e0b" },
  { label: "Rojo", value: "red", hex: "#dc2626" },
];

function hexColor(value: string): string {
  return COLORES_DISPONIBLES.find((c) => c.value === value)?.hex ?? "#94a3b8";
}

interface PropsTablaRangos {
  rangos: RangoResultado[];
  onGuardar: (rangos: Omit<RangoResultado, "id">[]) => Promise<void>;
}

export function TablaRangos({ rangos: rangosIniciales, onGuardar }: PropsTablaRangos) {
  const [rangos, setRangos] = useState<RangoEditable[]>(() =>
    rangosIniciales.map((r) => ({ ...r, _id: r.id })),
  );
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const rangosDominio: RangoResultado[] = rangos.map((r) => ({
    id: r._id,
    desde: r.desde,
    hasta: r.hasta,
    clasificacion: r.clasificacion,
    color: r.color,
    orden: r.orden,
  }));
  const errorValidacion = validarRangos(rangosDominio);

  const actualizar = (id: string, campo: keyof RangoEditable, valor: string | number) => {
    setRangos((prev) => prev.map((r) => (r._id === id ? { ...r, [campo]: valor } : r)));
    setErrorGuardado(null);
  };

  const agregar = () => {
    const ultimo = rangos[rangos.length - 1];
    const desdeNuevo = ultimo ? ultimo.hasta + 1 : 0;
    setRangos((prev) => [
      ...prev,
      {
        _id: `new-${Date.now()}`,
        desde: desdeNuevo,
        hasta: desdeNuevo + 10,
        clasificacion: "Nueva clasificación",
        color: "green",
        orden: prev.length,
      },
    ]);
  };

  const eliminar = (id: string) => {
    setRangos((prev) => prev.filter((r) => r._id !== id));
    setErrorGuardado(null);
  };

  const handleGuardar = async () => {
    if (errorValidacion) return;
    setGuardando(true);
    setErrorGuardado(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      await onGuardar(rangos.map(({ _id: _, ...r }) => r));
    } catch (e: unknown) {
      setErrorGuardado(e instanceof Error ? e.message : "Error al guardar rangos.");
    } finally {
      setGuardando(false);
    }
  };

  const rangosOrdenados = [...rangos].sort((a, b) => a.desde - b.desde);

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
      {/* Encabezado */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #eef1f5" }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "#0f172a" }}>
          Rangos de resultado
        </h3>
        <p style={{ marginTop: 2, fontSize: 13, color: "#94a3b8" }}>
          Define cómo se clasifica el puntaje final de la ficha.
        </p>
      </div>

      {/* Barra de vista previa */}
      <div style={{ padding: "16px 20px 0" }}>
        <div
          style={{
            position: "relative",
            height: 14,
            borderRadius: 7,
            background: "#f1f5f9",
            overflow: "hidden",
          }}
        >
          {rangosOrdenados.map((r) => {
            const ancho = Math.max(0, r.hasta - r.desde);
            return (
              <div
                key={r._id}
                style={{
                  position: "absolute",
                  left: `${r.desde}%`,
                  width: `${ancho}%`,
                  height: "100%",
                  background: hexColor(r.color),
                  transition: "all .15s",
                }}
              />
            );
          })}
        </div>

        {/* Marcas */}
        <div className="mt-1 flex justify-between">
          {[0, 50, 100].map((n) => (
            <span
              key={n}
              style={{ fontSize: 11, color: "#94a3b8", fontFamily: '"Roboto Mono", monospace' }}
            >
              {n}
            </span>
          ))}
        </div>

        {/* Leyenda de rangos */}
        <div className="mt-2 flex flex-wrap gap-3">
          {rangosOrdenados.map((r) => (
            <span key={r._id} className="flex items-center gap-1.5">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: hexColor(r.color),
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, color: "#475569" }}>
                {r.clasificacion}{" "}
                <span style={{ color: "#94a3b8", fontFamily: '"Roboto Mono", monospace' }}>
                  {r.desde}–{r.hasta}
                </span>
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ padding: "16px 20px" }}>
        {rangos.length === 0 ? (
          <p style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 14 }}>
            Sin rangos definidos. Agrega el primero.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 120px 1fr 170px 40px",
              gap: 0,
            }}
          >
            {["Desde", "Hasta", "Clasificación", "Color", ""].map((h) => (
              <div
                key={h}
                style={{
                  padding: "8px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".5px",
                  color: "#9aa6b6",
                  textTransform: "uppercase",
                  borderBottom: "1px solid #eef1f5",
                }}
              >
                {h}
              </div>
            ))}

            {rangos.map((rango) => {
              const solapado = errorValidacion?.includes(rango.clasificacion);
              return (
                <>
                  <InputCell key={`${rango._id}-desde`}>
                    <InputNum
                      value={rango.desde}
                      error={solapado}
                      onChange={(v) => actualizar(rango._id, "desde", v)}
                    />
                  </InputCell>
                  <InputCell key={`${rango._id}-hasta`}>
                    <InputNum
                      value={rango.hasta}
                      error={solapado}
                      onChange={(v) => actualizar(rango._id, "hasta", v)}
                    />
                  </InputCell>
                  <InputCell key={`${rango._id}-cls`}>
                    <InputText
                      value={rango.clasificacion}
                      onChange={(v) => actualizar(rango._id, "clasificacion", v)}
                    />
                  </InputCell>
                  <InputCell key={`${rango._id}-color`}>
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          background: hexColor(rango.color),
                          flexShrink: 0,
                        }}
                      />
                      <SelectColor
                        value={rango.color}
                        onChange={(v) => actualizar(rango._id, "color", v)}
                      />
                    </div>
                  </InputCell>
                  <InputCell key={`${rango._id}-del`}>
                    <EliminarBtn
                      label={`Eliminar rango ${rango.clasificacion}`}
                      onClick={() => eliminar(rango._id)}
                    />
                  </InputCell>
                </>
              );
            })}
          </div>
        )}

        {/* Errores */}
        {(errorValidacion || errorGuardado) && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 14px",
              borderRadius: 8,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              fontSize: 13,
              color: "#b91c1c",
            }}
          >
            {errorValidacion ?? errorGuardado}
          </div>
        )}

        {/* Acciones */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={agregar}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13.5,
              color: "#15803d",
              fontWeight: 500,
              padding: 0,
              transition: "opacity .1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = ".75")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            + Agregar rango
          </button>

          <button
            onClick={handleGuardar}
            disabled={!!errorValidacion || guardando}
            style={{
              marginLeft: "auto",
              padding: "8px 20px",
              borderRadius: 8,
              background: errorValidacion || guardando ? "#9ca3af" : "#15803d",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 600,
              border: "none",
              cursor: errorValidacion || guardando ? "not-allowed" : "pointer",
              boxShadow: "0 1px 2px rgba(21,128,61,.25)",
              transition: "background .1s",
            }}
            onMouseEnter={(e) => {
              if (!errorValidacion && !guardando)
                e.currentTarget.style.background = "#166534";
            }}
            onMouseLeave={(e) => {
              if (!errorValidacion && !guardando)
                e.currentTarget.style.background = "#15803d";
            }}
          >
            {guardando ? "Guardando..." : "Guardar rangos"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function InputCell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderBottom: "1px solid #f1f5f9",
        display: "flex",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}

const inputBase: React.CSSProperties = {
  width: "100%",
  height: 40,
  padding: "0 12px",
  borderRadius: 9,
  border: "1px solid #e2e8f0",
  background: "#fff",
  fontSize: 13.5,
  color: "#334155",
  outline: "none",
};

function InputNum({
  value,
  error,
  onChange,
}: {
  value: number;
  error?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      min={0}
      step={1}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        ...inputBase,
        fontFamily: '"Roboto Mono", monospace',
        borderColor: error ? "#fca5a5" : "#e2e8f0",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#16a34a";
        e.currentTarget.style.boxShadow = "0 0 0 3px #dcfce7";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = error ? "#fca5a5" : "#e2e8f0";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

function InputText({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={inputBase}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#16a34a";
        e.currentTarget.style.boxShadow = "0 0 0 3px #dcfce7";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "#e2e8f0";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

function SelectColor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputBase, flex: 1, cursor: "pointer" }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#16a34a";
        e.currentTarget.style.boxShadow = "0 0 0 3px #dcfce7";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "#e2e8f0";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {COLORES_DISPONIBLES.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </select>
  );
}

function EliminarBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "#94a3b8",
        padding: 4,
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        transition: "color .1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
    >
      <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
        <path
          d="M2 4h10M5 4V2h4v2M5.5 7v4M8.5 7v4M3 4l.7 7.3A1 1 0 004.7 12h4.6a1 1 0 001-.7L11 4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
