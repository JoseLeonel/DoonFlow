"use client";

import Link from "next/link";
import type { Certificacion } from "../_servicios/certificacion.servicio";
import { BadgeCapturaOffline } from "./badge-captura-offline";

const ETIQUETA_ESTADO: Record<string, string> = {
  EN_PROGRESO: "En progreso",
};

interface PropsTablaCertificaciones {
  certificaciones: Certificacion[];
  cargando: boolean;
}

export function TablaCertificaciones({ certificaciones, cargando }: PropsTablaCertificaciones) {
  if (cargando) {
    return (
      <div className="rounded-[10px] bg-white p-12 text-center shadow-1 dark:bg-gray-dark dark:shadow-card">
        <p className="text-body-sm text-dark-4 dark:text-dark-6">Cargando...</p>
      </div>
    );
  }

  if (certificaciones.length === 0) {
    return (
      <div className="rounded-[10px] bg-white p-12 text-center shadow-1 dark:bg-gray-dark dark:shadow-card">
        <p className="text-body-sm text-dark-4 dark:text-dark-6">No hay certificaciones registradas.</p>
        <Link
          href="/certificaciones/nueva"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 transition-colors"
        >
          <span className="text-base leading-none">+</span> Iniciar la primera certificación
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3">
              {["Período", "Estado", "Puntaje", "Cumplimiento", "Clasificación", "Fecha de inicio", ""].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {certificaciones.map((c) => (
              <tr key={c.id} className="border-b border-stroke last:border-0 dark:border-dark-3">
                <td className="px-5 py-3.5 text-dark dark:text-white">{c.periodoEtiqueta ?? "—"}</td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">
                  <div className="flex items-center gap-1.5">
                    <span>{ETIQUETA_ESTADO[c.estado] ?? c.estado}</span>
                    <BadgeCapturaOffline capturaOffline={c.capturaOffline} sincronizadoEn={c.sincronizadoEn} />
                  </div>
                </td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{c.puntajeObtenido} / {c.puntajeMaximo}</td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{c.porcentajeCumplimiento}%</td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{c.clasificacion ?? "—"}</td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{new Date(c.fechaInicio).toLocaleDateString("es-CR")}</td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/certificaciones/${c.id}/responder`} className="text-body-xs font-medium text-primary hover:underline">
                    Continuar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
