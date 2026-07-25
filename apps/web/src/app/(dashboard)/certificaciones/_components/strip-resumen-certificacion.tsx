"use client";

const ETIQUETA_ESTADO: Record<string, string> = {
  EN_PROGRESO: "En progreso",
  FIRMADA: "Firmada",
};

interface PropsStripResumenCertificacion {
  plantillaNombre: string;
  periodoTexto: string;
  estado: string;
  totalSecciones: number;
  totalPreguntas: number;
  puntajeObtenido: number;
  puntajeMaximo: number;
}

/**
 * Encabezado de la certificación en /responder — mismo lenguaje visual que
 * `StripResumenPlantilla` (Ficha BPM → Estructura), sin controles de edición.
 * Encontrado en pruebas manuales (2026-07-24): al retomar una certificación con "Continuar"
 * no había ningún encabezado que dijera qué plantilla/período se estaba respondiendo.
 */
export function StripResumenCertificacion({
  plantillaNombre, periodoTexto, estado, totalSecciones, totalPreguntas, puntajeObtenido, puntajeMaximo,
}: PropsStripResumenCertificacion) {
  return (
    <div
      className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-dark"
      style={{ padding: "18px 20px", borderRadius: 14, border: "1px solid #e6eaf0", boxShadow: "0 1px 2px rgba(16,24,40,.04)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex flex-shrink-0 items-center justify-center"
          style={{
            width: 42, height: 42, borderRadius: 11, background: "#ecfdf3", border: "1px solid #c5f0d6",
            fontSize: 17, fontWeight: 800, color: "#15803d", fontFamily: '"Roboto Mono", monospace', letterSpacing: ".5px",
          }}
        >
          BPM
        </div>
        <div className="min-w-0">
          <div className="truncate" style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
            {periodoTexto} · {plantillaNombre}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span style={{ color: "#64748b", fontSize: 12.5 }}>{ETIQUETA_ESTADO[estado] ?? estado}</span>
            <span style={{ color: "#cbd5e1" }}>·</span>
            <span style={{ color: "#64748b", fontSize: 12.5 }}>
              {totalSecciones} {totalSecciones === 1 ? "sección" : "secciones"} · {totalPreguntas} {totalPreguntas === 1 ? "ítem" : "ítems"}
            </span>
          </div>
        </div>
      </div>

      <div
        className="flex flex-col items-center"
        style={{ background: "#f0fdf4", border: "1px solid #c5f0d6", borderRadius: 10, padding: "8px 18px", minWidth: 170 }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "#15803d", letterSpacing: ".6px", textTransform: "uppercase" }}>
          Puntaje actual
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#14532d", fontFamily: '"Roboto Mono", monospace' }}>
          {puntajeObtenido} / {puntajeMaximo} pts
        </span>
      </div>
    </div>
  );
}
