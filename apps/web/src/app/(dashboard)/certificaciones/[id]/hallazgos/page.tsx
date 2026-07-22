"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { usarHallazgos } from "../../_hooks/usar-hallazgos";
import { BadgeSeveridad } from "../../_components/badge-severidad";
import { FormularioHallazgo } from "../../_components/formulario-hallazgo";

export default function PaginaHallazgosCertificacion() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    hallazgos, cargando, error, procesando, hayAlMenosUnHallazgo,
    crearManual, generarAutomaticos, adjuntarEvidencia,
  } = usarHallazgos(id);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const manejarCrearManual = async (datos: { descripcion: string; severidad: "CRITICA" | "MAYOR" | "MENOR"; archivo?: File }) => {
    const nuevo = await crearManual({ descripcion: datos.descripcion, severidad: datos.severidad });
    if (datos.archivo) await adjuntarEvidencia(nuevo.id, datos.archivo);
    setMostrarFormulario(false);
  };

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-4 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/certificaciones" className="hover:text-primary">Certificaciones</Link>
        <span className="mx-1.5">/</span>
        <span>Hallazgos</span>
      </nav>

      <div className="mx-auto max-w-[840px]">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-heading-6 font-bold text-dark dark:text-white">Hallazgos ({hallazgos.length})</h1>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={procesando}
              onClick={() => generarAutomaticos()}
              className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-1 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
            >
              Generar automáticos
            </button>
            <button
              type="button"
              onClick={() => setMostrarFormulario((v) => !v)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
            >
              + Agregar hallazgo manual
            </button>
          </div>
        </div>

        {mostrarFormulario && (
          <FormularioHallazgo onCrear={manejarCrearManual} onCancelar={() => setMostrarFormulario(false)} />
        )}

        {error && <p className="mb-4 text-body-sm text-red">{error}</p>}

        <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
          {cargando ? (
            <p className="p-8 text-center text-body-sm text-dark-4 dark:text-dark-6">Cargando...</p>
          ) : hallazgos.length === 0 ? (
            <p className="p-8 text-center text-body-sm text-dark-4 dark:text-dark-6">No hay hallazgos registrados.</p>
          ) : (
            <ul className="divide-y divide-stroke dark:divide-dark-3">
              {hallazgos.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <BadgeSeveridad severidad={h.severidad} />
                    <span className="text-sm text-dark dark:text-white">{h.descripcion}</span>
                  </div>
                  {h.evidencias.length > 0 && (
                    <span className="text-body-xs text-dark-4 dark:text-dark-6">📎 {h.evidencias.length} evidencia(s)</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          {hayAlMenosUnHallazgo && (
            <button
              type="button"
              onClick={() => router.push(`/certificaciones/${id}/plan`)}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-opacity-90"
            >
              Generar plan de cumplimiento
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
