"use client";

import { useState } from "react";
import Link from "next/link";
import { usarSeguimiento } from "../_hooks/usar-seguimiento";
import { BadgeEstadoAccion } from "../_components/badge-estado-accion";

export default function PaginaSeguimientoCertificacion() {
  const { acciones, cargando, error, actualizarAvance, adjuntarEvidencia, enviarARevision } = usarSeguimiento();
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  const pendientes = acciones.filter((a) => a.estado !== "CUMPLIDO" && a.estado !== "EN_REVISION");
  const accion = acciones.find((a) => a.id === seleccionada) ?? null;

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-4 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/certificaciones" className="hover:text-primary">Certificaciones</Link>
        <span className="mx-1.5">/</span>
        <span>Mis acciones correctivas</span>
      </nav>

      <div className="mx-auto grid max-w-[960px] gap-6 md:grid-cols-[1fr_360px]">
        <div>
          <h1 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
            Mis acciones correctivas ({pendientes.length} pendientes)
          </h1>

          {error && <p className="mb-4 text-body-sm text-red">{error}</p>}

          <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
            {cargando ? (
              <p className="p-8 text-center text-body-sm text-dark-4 dark:text-dark-6">Cargando...</p>
            ) : acciones.length === 0 ? (
              <p className="p-8 text-center text-body-sm text-dark-4 dark:text-dark-6">No tienes acciones correctivas asignadas.</p>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-dark-3">
                {acciones.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-medium text-dark dark:text-white">{a.descripcion}</p>
                      <p className="text-body-xs text-dark-4 dark:text-dark-6">
                        Vence: {new Date(a.fechaLimite).toLocaleDateString("es-CR")} · Avance: {a.porcentajeAvance}%
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <BadgeEstadoAccion estado={a.estado} />
                      <button
                        type="button"
                        onClick={() => setSeleccionada(a.id)}
                        className="text-body-xs font-medium text-primary hover:underline"
                      >
                        Ver detalle
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {accion && (
          <DetalleAccionSeguimiento
            key={accion.id}
            accion={accion}
            onActualizarAvance={(p) => actualizarAvance(accion.id, p)}
            onAdjuntarEvidencia={(archivo, comentario) => adjuntarEvidencia(accion.id, archivo, comentario)}
            onEnviarARevision={() => enviarARevision(accion.id).then(() => setSeleccionada(null))}
          />
        )}
      </div>
    </div>
  );
}

function DetalleAccionSeguimiento({
  accion,
  onActualizarAvance,
  onAdjuntarEvidencia,
  onEnviarARevision,
}: {
  accion: ReturnType<typeof usarSeguimiento>["acciones"][number];
  onActualizarAvance: (porcentaje: number) => Promise<unknown>;
  onAdjuntarEvidencia: (archivo: File, comentario?: string) => Promise<unknown>;
  onEnviarARevision: () => Promise<unknown>;
}) {
  const [avance, setAvance] = useState(accion.porcentajeAvance);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  return (
    <div className="h-fit rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <h2 className="mb-3 text-body-sm font-semibold text-dark dark:text-white">{accion.descripcion}</h2>

      <label className="mb-1.5 block text-body-xs text-dark-4 dark:text-dark-6">Avance: {avance}%</label>
      <input
        type="range"
        min={0}
        max={100}
        value={avance}
        onChange={(e) => setAvance(Number(e.target.value))}
        onMouseUp={() => onActualizarAvance(avance)}
        onTouchEnd={() => onActualizarAvance(avance)}
        className="mb-4 w-full"
      />

      <h3 className="mb-2 text-body-xs font-semibold text-dark dark:text-white">Evidencias</h3>
      <ul className="mb-2 space-y-1">
        {accion.evidencias.map((e) => (
          <li key={e.id} className="text-body-xs text-dark-4 dark:text-dark-6">📄 {e.nombre}</li>
        ))}
      </ul>
      <input
        type="file"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) onAdjuntarEvidencia(archivo, comentario || undefined);
        }}
        className="mb-3 w-full text-body-xs text-dark-4 dark:text-dark-6"
      />
      <input
        type="text"
        placeholder="Comentario (opcional)"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        className="mb-4 w-full rounded-lg border border-stroke bg-transparent px-3 py-1.5 text-body-xs text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
      />

      <button
        type="button"
        disabled={enviando}
        onClick={async () => { setEnviando(true); try { await onEnviarARevision(); } finally { setEnviando(false); } }}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
      >
        Enviar a revisión
      </button>
    </div>
  );
}
