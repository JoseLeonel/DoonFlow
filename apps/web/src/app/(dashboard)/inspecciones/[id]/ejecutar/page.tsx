"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { PlantillaCompleta, Subapartado, Pregunta } from "../../_servicios/inspeccion.servicio";
import { IndicadorRequerida, IndicadorComentario, IndicadorEvidencia } from "../../_components/indicador-pregunta";
import { cn } from "@doonflow/shared";

// ── Tipos locales de estado para la ejecución ──────────────────────────────

interface RespuestaPregunta {
  valor: string;
  comentario: string;
  mostrarComentario: boolean;
}

// ── Componente raíz ────────────────────────────────────────────────────────

export default function PaginaEjecutarInspeccion() {
  const { id } = useParams<{ id: string }>();
  const [plantilla, setPlantilla] = useState<PlantillaCompleta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [respuestas, setRespuestas] = useState<Record<string, RespuestaPregunta>>({});
  const [apartadosAbiertos, setApartadosAbiertos] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/inspeccion/plantillas/${id}`)
      .then((r) => r.json())
      .then((json) => {
        setPlantilla(json.data);
        // Abrir el primer apartado por defecto
        if (json.data?.apartados?.[0]) {
          setApartadosAbiertos(new Set([json.data.apartados[0].id]));
        }
      })
      .finally(() => setCargando(false));
  }, [id]);

  const actualizarRespuesta = (preguntaId: string, campo: keyof RespuestaPregunta, nuevoValor: string | boolean) => {
    setRespuestas((prev) => ({
      ...prev,
      [preguntaId]: {
        valor: "",
        comentario: "",
        mostrarComentario: false,
        ...prev[preguntaId],
        [campo]: nuevoValor,
      },
    }));
  };

  const toggleApartado = (id: string) => {
    setApartadosAbiertos((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-stroke border-t-primary" />
      </div>
    );
  }

  if (!plantilla) return <p className="p-8 text-red">Plantilla no encontrada.</p>;

  const totalPreguntas = plantilla.apartados.flatMap((a) => a.subapartados.flatMap((s) => s.preguntas)).length;
  const respondidas = Object.keys(respuestas).filter((k) => respuestas[k]?.valor).length;
  const progreso = totalPreguntas > 0 ? Math.round((respondidas / totalPreguntas) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray p-4 md:p-7.5 dark:bg-dark">
      <div className="mx-auto max-w-[900px]">
        {/* Cabecera de inspección */}
        <div className="mb-6 rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h1 className="text-heading-6 font-bold text-dark dark:text-white">{plantilla.nombre}</h1>
          {plantilla.descripcion && (
            <p className="mt-1 text-body-sm text-dark-4 dark:text-dark-6">{plantilla.descripcion}</p>
          )}

          {/* Barra de progreso */}
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-body-xs text-dark-4 dark:text-dark-6">
              <span>{respondidas} de {totalPreguntas} preguntas respondidas</span>
              <span className="font-medium text-primary">{progreso}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-3 dark:bg-dark-3">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>
        </div>

        {/* Niveles: Apartados → Subapartados → Preguntas */}
        <div className="space-y-4">
          {plantilla.apartados.map((apartado, idxApto) => (
            <div
              key={apartado.id}
              className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card"
            >
              {/* Título del Apartado (Nivel 1) */}
              <button
                onClick={() => toggleApartado(apartado.id)}
                className="flex w-full items-center justify-between bg-primary/[0.06] px-6 py-4 text-left hover:bg-primary/[0.10] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {idxApto + 1}
                  </span>
                  <div>
                    <span className="text-body-xs font-medium uppercase tracking-widest text-primary">
                      {apartado.codigo}
                    </span>
                    <h2 className="text-base font-bold text-dark dark:text-white">{apartado.nombre}</h2>
                  </div>
                </div>
                <svg
                  className={cn("h-5 w-5 text-dark-4 transition-transform", apartadosAbiertos.has(apartado.id) && "rotate-180")}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Subapartados y preguntas */}
              {apartadosAbiertos.has(apartado.id) && (
                <div className="divide-y divide-stroke dark:divide-dark-3">
                  {apartado.subapartados.map((sub, idxSub) => (
                    <SubapartadoBloque
                      key={sub.id}
                      subapartado={sub}
                      numeroApto={idxApto + 1}
                      numeroSub={idxSub + 1}
                      respuestas={respuestas}
                      onChange={actualizarRespuesta}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Botón de finalizar */}
        <div className="mt-6 flex justify-end">
          <button
            className="rounded-lg bg-primary px-8 py-3 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            disabled={progreso < 100}
          >
            Finalizar inspección
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Subapartado (Nivel 2) ──────────────────────────────────────────────────

function SubapartadoBloque({
  subapartado, numeroApto, numeroSub, respuestas, onChange,
}: {
  subapartado: Subapartado;
  numeroApto: number;
  numeroSub: number;
  respuestas: Record<string, RespuestaPregunta>;
  onChange: (id: string, campo: string, valor: string | boolean) => void;
}) {
  return (
    <div className="px-6 py-4">
      {/* Título del Subapartado (Nivel 2) */}
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-dark-3 dark:text-dark-6">
        <span className="text-body-xs font-medium uppercase tracking-wider text-primary/70">
          {subapartado.codigo}
        </span>
        {subapartado.nombre}
      </h3>

      {/* Preguntas del subapartado */}
      <div className="space-y-3">
        {subapartado.preguntas.map((pregunta, idx) => (
          <PreguntaItem
            key={pregunta.id}
            pregunta={pregunta}
            numero={`${numeroApto}.${numeroSub}.${idx + 1}`}
            respuesta={respuestas[pregunta.id] ?? { valor: "", comentario: "", mostrarComentario: false }}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

// ── Pregunta individual ────────────────────────────────────────────────────

function PreguntaItem({
  pregunta, numero, respuesta, onChange,
}: {
  pregunta: Pregunta;
  numero: string;
  respuesta: RespuestaPregunta;
  onChange: (id: string, campo: string, valor: string | boolean) => void;
}) {
  const requiereComentario =
    pregunta.reglaComentario === "SIEMPRE" ||
    (pregunta.reglaComentario === "CUANDO_NEGATIVO" && respuesta.valor === "NO") ||
    (pregunta.reglaComentario === "CUANDO_PUNTAJE_MENOR_MAXIMO" && respuesta.mostrarComentario);

  const esRespondida = !!respuesta.valor;

  return (
    <div className={cn(
      "rounded-lg border p-4 transition-colors",
      esRespondida
        ? "border-green-light-1/30 bg-green-light-7 dark:bg-dark-2 dark:border-dark-3"
        : "border-stroke bg-gray-1/50 dark:border-dark-3 dark:bg-dark-2",
    )}>
      {/* Encabezado de la pregunta */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0 text-body-xs font-bold text-primary">{numero}</span>
            <p className="text-sm font-medium text-dark dark:text-white">{pregunta.descripcion}</p>
          </div>
        </div>
        {/* Indicadores */}
        <div className="flex flex-wrap gap-1.5">
          {pregunta.evidenciaObligatoria && (
            <IndicadorEvidencia obligatoria={pregunta.evidenciaObligatoria} minima={pregunta.evidenciaMinima} />
          )}
          <IndicadorComentario regla={pregunta.reglaComentario} />
        </div>
      </div>

      {/* Widget de respuesta según tipo */}
      <RespuestaWidget
        pregunta={pregunta}
        valor={respuesta.valor}
        onChange={(v) => {
          onChange(pregunta.id, "valor", v);
          // Mostrar comentario automáticamente si corresponde
          const mostrar =
            pregunta.reglaComentario === "SIEMPRE" ||
            (pregunta.reglaComentario === "CUANDO_NEGATIVO" && v === "NO");
          onChange(pregunta.id, "mostrarComentario", mostrar);
        }}
      />

      {/* Área de comentario (aparece según regla) */}
      {(requiereComentario || respuesta.mostrarComentario) && (
        <div className="mt-3">
          <label className="mb-1 flex items-center gap-1 text-body-xs font-medium text-dark-4 dark:text-dark-6">
            Comentario
            {requiereComentario && <IndicadorRequerida />}
          </label>
          <textarea
            rows={2}
            value={respuesta.comentario}
            onChange={(e) => onChange(pregunta.id, "comentario", e.target.value)}
            placeholder="Ingrese un comentario..."
            className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary resize-none"
          />
        </div>
      )}
    </div>
  );
}

// ── Widget de respuesta ────────────────────────────────────────────────────

function RespuestaWidget({
  pregunta, valor, onChange,
}: {
  pregunta: Pregunta;
  valor: string;
  onChange: (v: string) => void;
}) {
  switch (pregunta.tipoRespuesta) {
    case "SI_NO":
      return (
        <div className="flex gap-3">
          {["SI", "NO"].map((opcion) => (
            <button
              key={opcion}
              onClick={() => onChange(opcion)}
              className={cn(
                "flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                valor === opcion
                  ? opcion === "SI"
                    ? "border-green-light-1 bg-green-light-7 text-green-dark dark:bg-green-dark/10"
                    : "border-red-light/50 bg-red-light/[0.08] text-red"
                  : "border-stroke bg-white text-dark-4 hover:border-stroke-dark dark:border-dark-3 dark:bg-dark-3 dark:text-dark-6",
              )}
            >
              {opcion === "SI" ? "✓  Sí" : "✗  No"}
            </button>
          ))}
        </div>
      );

    case "SELECCION_UNICA":
      return (
        <div className="flex flex-col gap-2">
          {pregunta.opciones.map((op) => (
            <label key={op.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-stroke p-3 hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-3">
              <input type="radio" name={pregunta.id} value={op.valor} checked={valor === op.valor}
                onChange={() => onChange(op.valor)}
                className="h-4 w-4 text-primary focus:ring-primary" />
              <span className="text-sm text-dark dark:text-white">{op.etiqueta}</span>
              {op.puntaje > 0 && <span className="ml-auto text-body-xs text-dark-4">{op.puntaje} pts</span>}
            </label>
          ))}
        </div>
      );

    case "TEXTO_LIBRE":
      return (
        <textarea rows={2} value={valor} onChange={(e) => onChange(e.target.value)}
          placeholder="Ingrese su respuesta..."
          className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white resize-none" />
      );

    case "NUMERICO":
      return (
        <input type="number" value={valor} onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-32 rounded-lg border border-stroke bg-white px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white" />
      );

    case "PUNTAJE_MANUAL":
      return (
        <div className="flex items-center gap-3">
          <input type="number" min={0} max={pregunta.puntajeMaximo} value={valor}
            onChange={(e) => onChange(e.target.value)}
            className="w-28 rounded-lg border border-stroke bg-white px-4 py-2 text-center text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white" />
          <span className="text-body-sm text-dark-4 dark:text-dark-6">/ {pregunta.puntajeMaximo} pts</span>
        </div>
      );

    default:
      return <input type="text" value={valor} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white outline-none focus:border-primary" />;
  }
}
