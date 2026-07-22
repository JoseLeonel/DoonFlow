"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@doonflow/shared";
import { usarRevisionCertificacion } from "../../_hooks/usar-revision-certificacion";
import { usarCapturaOffline } from "../../_hooks/usar-captura-offline";
import { BannerEstadoConexion } from "../../_components/banner-estado-conexion";

export default function PaginaRevisionCertificacion() {
  const { id } = useParams<{ id: string }>();
  const { resumen, cargando, error, haySeccionesIncompletas, guardarYFinalizar, volverASeccion } = usarRevisionCertificacion(id);
  // Informativo únicamente — este sprint no agrega un botón "Firmar y certificar" que bloquear
  // (lo agrega 005-certificacion-plan-cumplimiento, pausado; T-501 queda parcialmente bloqueado
  // por esa razón, ver impl.md). Mostrar pendientes aquí sí es útil y no depende de 005.
  const capturaOffline = usarCapturaOffline(id);

  if (cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-stroke border-t-primary" />
      </div>
    );
  }

  if (error || !resumen) {
    return <p className="p-8 text-red">{error ?? "No se pudo cargar el resumen."}</p>;
  }

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/certificaciones" className="hover:text-primary">Certificaciones</Link>
        <span className="mx-1.5">/</span>
        <span>Revisión</span>
      </nav>

      <div className="mx-auto max-w-[720px]">
        <BannerEstadoConexion
          estado={capturaOffline.estadoSincronizacion}
          pendientes={capturaOffline.pendientes}
          alertaDatosAntiguos={capturaOffline.alertaDatosAntiguos}
        />

        <div className="mb-6 rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h1 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">Resumen de la certificación</h1>

          <div className="mb-6 flex items-center gap-6">
            <div>
              <p className="text-body-xs text-dark-4 dark:text-dark-6">Puntaje obtenido</p>
              <p className="text-heading-5 font-bold text-primary">
                {resumen.puntajeObtenido} <span className="text-body-sm font-normal text-dark-4">/ {resumen.puntajeMaximo}</span>
              </p>
            </div>
            <div>
              <p className="text-body-xs text-dark-4 dark:text-dark-6">Porcentaje</p>
              <p className="text-heading-5 font-bold text-dark dark:text-white">{resumen.porcentajeCumplimiento}%</p>
            </div>
            {resumen.clasificacion && (
              <div>
                <p className="text-body-xs text-dark-4 dark:text-dark-6">Clasificación</p>
                <p className="text-heading-5 font-bold text-dark dark:text-white">{resumen.clasificacion}</p>
              </div>
            )}
          </div>

          {haySeccionesIncompletas && (
            <p className="mb-4 rounded-lg bg-yellow-light-4 px-4 py-2.5 text-body-sm text-yellow-dark">
              Hay secciones sin responder por completo. Puede finalizar de todas formas o volver a completarlas.
            </p>
          )}

          <div className="divide-y divide-stroke dark:divide-dark-3">
            {resumen.porSeccion.map((s) => {
              const completa = s.total > 0 && s.respondidas === s.total;
              return (
                <div key={s.seccionId} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-dark dark:text-white">{s.titulo}</p>
                    <p className={cn("text-body-xs", completa ? "text-dark-4 dark:text-dark-6" : "text-yellow-dark")}>
                      {s.respondidas} de {s.total} preguntas respondidas
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => volverASeccion(s.seccionId)}
                    className="text-body-xs font-medium text-primary hover:underline"
                  >
                    Volver a esta sección
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={guardarYFinalizar}
            className="rounded-lg bg-primary px-8 py-2.5 text-sm font-medium text-white hover:bg-opacity-90"
          >
            Guardar y finalizar
          </button>
        </div>
      </div>
    </div>
  );
}
