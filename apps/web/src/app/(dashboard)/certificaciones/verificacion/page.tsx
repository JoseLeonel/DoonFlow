"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVerificacion } from "../_hooks/use-verificacion";
import { useSelectorCertificaciones } from "../_hooks/use-selector-certificaciones";
import { PanelVerificacionAccion } from "../_components/panel-verificacion-accion";
import { formatearPeriodoCertificacion } from "../_hooks/formato-periodo";

const ETIQUETA_ESTADO: Record<string, string> = { FINALIZADA: "Finalizada", FIRMADA: "Firmada" };

export default function PaginaVerificacionCertificacion() {
  const router = useRouter();
  const { acciones, cargando, error, verificar } = useVerificacion();
  const { certificaciones, cargando: cargandoCertificaciones } = useSelectorCertificaciones();
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [certificacionElegida, setCertificacionElegida] = useState("");
  const accion = acciones.find((a) => a.id === seleccionada) ?? null;

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-4 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/certificaciones" className="hover:text-primary">Certificaciones</Link>
        <span className="mx-1.5">/</span>
        <span>Verificación de acciones</span>
      </nav>

      <div className="mx-auto grid max-w-[960px] gap-6 md:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-6 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark dark:shadow-card">
            <h2 className="mb-3 text-body-sm font-semibold text-dark dark:text-white">
              Ir al plan de cumplimiento de una certificación
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={certificacionElegida}
                onChange={(e) => setCertificacionElegida(e.target.value)}
                disabled={cargandoCertificaciones}
                className="min-w-[280px] flex-1 rounded-lg border border-stroke bg-white px-4 py-2.5 text-sm text-dark outline-none focus:border-primary disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              >
                <option value="">Seleccione una certificación...</option>
                {certificaciones.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatearPeriodoCertificacion(c)} · {ETIQUETA_ESTADO[c.estado] ?? c.estado} · {c.porcentajeCumplimiento}%
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!certificacionElegida}
                onClick={() => router.push(`/certificaciones/${certificacionElegida}/plan`)}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ir al plan
              </button>
            </div>
          </div>

          <h1 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
            Acciones en revisión ({acciones.length})
          </h1>

          {error && <p className="mb-4 text-body-sm text-red">{error}</p>}

          <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
            {cargando ? (
              <p className="p-8 text-center text-body-sm text-dark-4 dark:text-dark-6">Cargando...</p>
            ) : acciones.length === 0 ? (
              <p className="p-8 text-center text-body-sm text-dark-4 dark:text-dark-6">No hay acciones pendientes de verificar.</p>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-dark-3">
                {acciones.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-medium text-dark dark:text-white">{a.descripcion} · {a.porcentajeAvance}%</p>
                      <p className="text-body-xs text-dark-4 dark:text-dark-6">Responsable: {a.responsableNombre}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSeleccionada(a.id)}
                      className="text-body-xs font-medium text-primary hover:underline"
                    >
                      Revisar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {accion && (
          <PanelVerificacionAccion
            key={accion.id}
            accion={accion}
            onVerificar={async (resultado, comentario, nuevaFechaLimite) => {
              await verificar(accion.id, resultado, comentario, nuevaFechaLimite);
              setSeleccionada(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
