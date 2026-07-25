"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useHallazgos } from "../../_hooks/use-hallazgos";
import { useHallazgosFrecuentesActivos } from "../../_hooks/use-hallazgos-frecuentes-activos";
import { BadgeSeveridad } from "../../_components/badge-severidad";
import { FormularioHallazgo } from "../../_components/formulario-hallazgo";
import { SelectorHallazgoFrecuente } from "../../_components/selector-hallazgo-frecuente";
import type { CategoriaHallazgo, Hallazgo, Severidad } from "@doonflow/shared";

/**
 * Clasificación del reporte de hallazgos pedida por el cliente (revisión de audios WhatsApp
 * 2026-06-03/04): además de las no conformidades (con severidad, disparan plan de cumplimiento),
 * se muestran los reconocimientos/observaciones/oportunidades de mejora generados desde los 3
 * comentarios siempre visibles del wizard — puramente informativos.
 */
const SECCIONES: { categoria: CategoriaHallazgo; titulo: string }[] = [
  { categoria: "NO_CONFORMIDAD", titulo: "No conformidades" },
  { categoria: "RECONOCIMIENTO", titulo: "Reconocimientos" },
  { categoria: "OBSERVACION", titulo: "Observaciones" },
  { categoria: "OPORTUNIDAD_MEJORA", titulo: "Oportunidades de mejora" },
];

export default function PaginaHallazgosCertificacion() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    hallazgos, cargando, error, procesando, hayAlMenosUnHallazgo,
    crearManual, generarAutomaticos, generarDesdeComentarios, adjuntarEvidencia,
  } = useHallazgos(id);
  const { items: hallazgosFrecuentes, cargando: cargandoHallazgosFrecuentes } = useHallazgosFrecuentesActivos();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [precarga, setPrecarga] = useState<{ descripcion: string; severidad: Severidad } | undefined>(undefined);

  const manejarCrearManual = async (datos: { descripcion: string; severidad: "CRITICA" | "MAYOR" | "MENOR"; archivo?: File }) => {
    const nuevo = await crearManual({ descripcion: datos.descripcion, categoria: "NO_CONFORMIDAD", severidad: datos.severidad });
    if (datos.archivo) await adjuntarEvidencia(nuevo.id, datos.archivo);
    setMostrarFormulario(false);
    setPrecarga(undefined);
  };

  const elegirDeBiblioteca = (item: { descripcion: string; severidad: Severidad }) => {
    setPrecarga(item);
    setMostrarSelector(false);
    setMostrarFormulario(true);
  };

  const hallazgosPorCategoria = (categoria: CategoriaHallazgo): Hallazgo[] => hallazgos.filter((h) => h.categoria === categoria);

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
          <div className="flex flex-wrap justify-end gap-2">
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
              disabled={procesando}
              onClick={() => generarDesdeComentarios()}
              className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-1 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
            >
              Generar de comentarios
            </button>
            <button
              type="button"
              onClick={() => setMostrarSelector(true)}
              className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
            >
              📚 Elegir de biblioteca
            </button>
            <button
              type="button"
              onClick={() => { setPrecarga(undefined); setMostrarFormulario((v) => !v); }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
            >
              + Agregar hallazgo manual
            </button>
          </div>
        </div>

        {mostrarSelector && (
          <SelectorHallazgoFrecuente
            items={hallazgosFrecuentes}
            cargando={cargandoHallazgosFrecuentes}
            onElegir={elegirDeBiblioteca}
            onCerrar={() => setMostrarSelector(false)}
          />
        )}

        {mostrarFormulario && (
          <FormularioHallazgo
            onCrear={manejarCrearManual}
            onCancelar={() => { setMostrarFormulario(false); setPrecarga(undefined); }}
            precarga={precarga}
          />
        )}

        {error && <p className="mb-4 text-body-sm text-red">{error}</p>}

        {cargando ? (
          <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
            <p className="p-8 text-center text-body-sm text-dark-4 dark:text-dark-6">Cargando...</p>
          </div>
        ) : hallazgos.length === 0 ? (
          <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
            <p className="p-8 text-center text-body-sm text-dark-4 dark:text-dark-6">No hay hallazgos registrados.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {SECCIONES.map(({ categoria, titulo }) => {
              const items = hallazgosPorCategoria(categoria);
              if (items.length === 0) return null;
              return (
                <div key={categoria} className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
                  <h2 className="border-b border-stroke px-4 py-3 text-body-sm font-semibold text-dark dark:border-dark-3 dark:text-white">
                    {titulo} ({items.length})
                  </h2>
                  <ul className="divide-y divide-stroke dark:divide-dark-3">
                    {items.map((h) => (
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
                </div>
              );
            })}
          </div>
        )}

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
