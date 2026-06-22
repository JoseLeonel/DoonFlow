"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { PlantillaCompleta, Apartado } from "../_servicios/inspeccion.servicio";
import { BadgeTipo } from "../_components/badge-tipo";
import { cn } from "@doonflow/shared";

export default function PaginaEditorPlantilla() {
  const { id } = useParams<{ id: string }>();
  const [plantilla, setPlantilla] = useState<PlantillaCompleta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [apartadoSeleccionado, setApartadoSeleccionado] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState<Date | null>(null);

  useEffect(() => {
    fetch(`/api/inspeccion/plantillas/${id}`)
      .then((r) => r.json())
      .then((json) => {
        setPlantilla(json.data);
        setApartadoSeleccionado(json.data?.apartados?.[0]?.id ?? null);
      })
      .finally(() => setCargando(false));
  }, [id]);

  const agregarApartado = async () => {
    if (!plantilla) return;
    const nombre = window.prompt("Nombre del apartado:");
    if (!nombre) return;
    const codigo = String(plantilla.apartados.length + 1);
    const res = await fetch(`/api/inspeccion/plantillas/${id}/apartados`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo, nombre, orden: plantilla.apartados.length, puntajeMaximo: 0 }),
    });
    const json = await res.json();
    if (res.ok) {
      setPlantilla((prev) => prev ? { ...prev, apartados: [...prev.apartados, { ...json.data, subapartados: [] }] } : prev);
      setApartadoSeleccionado(json.data.id);
      setUltimoGuardado(new Date());
    }
  };

  if (cargando) {
    return <div className="flex min-h-screen items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-4 border-stroke border-t-primary" /></div>;
  }
  if (!plantilla) return <p className="p-8 text-red">Plantilla no encontrada.</p>;

  const totalPreguntas = plantilla.apartados.reduce((s, a) => s + a.subapartados.reduce((ss, sub) => ss + sub.preguntas.length, 0), 0);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray dark:bg-dark">
      {/* Barra superior */}
      <header className="flex items-center justify-between border-b border-stroke bg-white px-6 py-3 dark:border-dark-3 dark:bg-gray-dark">
        <div className="flex items-center gap-3">
          <Link href="/inspecciones" className="text-dark-4 hover:text-primary dark:text-dark-6">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="font-bold text-dark dark:text-white">{plantilla.nombre}</h1>
            <div className="flex items-center gap-2 text-body-xs text-dark-4 dark:text-dark-6">
              <BadgeTipo tipo={plantilla.tipo} />
              <span>·</span>
              <span>{totalPreguntas} pregunta{totalPreguntas !== 1 ? "s" : ""}</span>
              <span>·</span>
              <span>v{plantilla.version}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {ultimoGuardado && (
            <span className="text-body-xs text-green-dark dark:text-green-light">
              ✓ Guardado {ultimoGuardado.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <Link
            href={`/inspecciones/${id}/ejecutar`}
            className="rounded-lg bg-green-light-7 px-4 py-2 text-sm font-medium text-green-dark hover:bg-green-light-6 transition-colors"
          >
            Vista previa / Ejecutar
          </Link>
          <button
            onClick={() => plantilla.activa
              ? fetch(`/api/inspeccion/plantillas/${id}/desactivar`, { method: "POST" })
              : fetch(`/api/inspeccion/plantillas/${id}/activar`, { method: "POST" })
            }
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              plantilla.activa
                ? "bg-yellow-light-4 text-yellow-dark hover:bg-yellow-light"
                : "bg-primary text-white hover:bg-opacity-90",
            )}
          >
            {plantilla.activa ? "Desactivar" : "Activar"}
          </button>
        </div>
      </header>

      {/* Cuerpo — dos columnas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Columna izquierda: árbol de apartados */}
        <aside className="w-72 flex-shrink-0 overflow-y-auto border-r border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-body-xs font-semibold uppercase tracking-widest text-dark-4 dark:text-dark-6">
                Apartados
              </span>
              <button
                onClick={agregarApartado}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/[0.1] text-primary hover:bg-primary/[0.2] transition-colors"
                title="Agregar apartado"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {plantilla.apartados.length === 0 ? (
              <p className="py-4 text-center text-body-xs text-dark-5 dark:text-dark-6">
                Sin apartados. Agrega el primero.
              </p>
            ) : (
              <div className="space-y-1">
                {plantilla.apartados.map((apto, idx) => (
                  <ApartadoItemArbol
                    key={apto.id}
                    apartado={apto}
                    numero={idx + 1}
                    seleccionado={apartadoSeleccionado === apto.id}
                    onSeleccionar={() => setApartadoSeleccionado(apto.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Columna derecha: detalle del apartado seleccionado */}
        <main className="flex-1 overflow-y-auto p-6">
          {apartadoSeleccionado ? (
            <Detalle
              apartado={plantilla.apartados.find((a) => a.id === apartadoSeleccionado)}
              plantillaId={id}
              onActualizar={() => {
                setUltimoGuardado(new Date());
                fetch(`/api/inspeccion/plantillas/${id}`)
                  .then((r) => r.json())
                  .then((json) => setPlantilla(json.data));
              }}
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-dark-4 dark:text-dark-6">
              Selecciona un apartado del panel izquierdo.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ApartadoItemArbol({ apartado, numero, seleccionado, onSeleccionar }: {
  apartado: Apartado; numero: number; seleccionado: boolean; onSeleccionar: () => void;
}) {
  const totalPreguntas = apartado.subapartados.reduce((s, sub) => s + sub.preguntas.length, 0);
  return (
    <button
      onClick={onSeleccionar}
      className={cn(
        "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
        seleccionado
          ? "bg-primary/[0.1] text-primary"
          : "text-dark hover:bg-gray-1 dark:text-white dark:hover:bg-dark-2",
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-body-xs font-bold", seleccionado ? "bg-primary text-white" : "bg-gray-3 text-dark-4 dark:bg-dark-3 dark:text-dark-6")}>
          {numero}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{apartado.nombre}</p>
          <p className="text-body-xs opacity-70">{apartado.subapartados.length} subap. · {totalPreguntas} preg.</p>
        </div>
      </div>
    </button>
  );
}

function Detalle({ apartado, plantillaId, onActualizar }: {
  apartado: Apartado | undefined; plantillaId: string; onActualizar: () => void;
}) {
  if (!apartado) return null;

  const agregarSubapartado = async () => {
    const nombre = window.prompt("Nombre del subapartado:");
    if (!nombre) return;
    const codigo = `${apartado.codigo}.${apartado.subapartados.length + 1}`;
    await fetch(`/api/inspeccion/subapartados`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apartadoId: apartado.id, codigo, nombre, orden: apartado.subapartados.length }),
    });
    onActualizar();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-heading-6 font-bold text-dark dark:text-white">{apartado.codigo}. {apartado.nombre}</h2>
          <p className="text-body-sm text-dark-4 dark:text-dark-6">
            {apartado.subapartados.length} subapartados · {apartado.subapartados.reduce((s, sub) => s + sub.preguntas.length, 0)} preguntas
          </p>
        </div>
      </div>

      {/* Subapartados */}
      <div className="space-y-4">
        {apartado.subapartados.map((sub, idx) => (
          <div key={sub.id} className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
            {/* Título del subapartado */}
            <div className="flex items-center justify-between border-b border-stroke px-5 py-3 dark:border-dark-3">
              <h3 className="font-semibold text-dark dark:text-white">
                <span className="mr-2 text-body-xs font-bold text-primary">{sub.codigo}</span>
                {sub.nombre}
              </h3>
              <button className="text-body-xs text-primary hover:underline">+ Pregunta</button>
            </div>

            {/* Preguntas */}
            {sub.preguntas.length === 0 ? (
              <p className="px-5 py-4 text-body-sm text-dark-5 dark:text-dark-6">Sin preguntas aún.</p>
            ) : (
              <div className="divide-y divide-stroke dark:divide-dark-3">
                {sub.preguntas.map((p, qIdx) => (
                  <div key={p.id} className="flex items-start gap-3 px-5 py-3">
                    <span className="mt-0.5 flex-shrink-0 rounded bg-primary/[0.08] px-2 py-0.5 text-body-xs font-bold text-primary">
                      {sub.codigo}.{qIdx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-dark dark:text-white">{p.descripcion}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-gray-2 px-2 py-0.5 text-body-xs text-dark-4 dark:bg-dark-3 dark:text-dark-6">
                          {p.tipoRespuesta.replace("_", " ")}
                        </span>
                        {p.reglaComentario !== "NUNCA" && (
                          <span className="rounded-full bg-yellow-light-4 px-2 py-0.5 text-body-xs text-yellow-dark">
                            Comentario: {p.reglaComentario.toLowerCase().replace(/_/g, " ")}
                          </span>
                        )}
                        {p.evidenciaObligatoria && (
                          <span className="rounded-full bg-primary/[0.08] px-2 py-0.5 text-body-xs text-primary">
                            Evidencia req.
                          </span>
                        )}
                        <span className="rounded-full bg-gray-1 px-2 py-0.5 text-body-xs text-dark-5 dark:bg-dark-3">
                          {p.puntajeMaximo} pts
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Botón agregar subapartado */}
        <button
          onClick={agregarSubapartado}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-stroke py-4 text-sm text-dark-4 hover:border-primary hover:text-primary dark:border-dark-3 dark:text-dark-6 dark:hover:border-primary transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar subapartado
        </button>
      </div>
    </div>
  );
}
