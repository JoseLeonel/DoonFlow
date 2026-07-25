"use client";

import { useEffect, useState } from "react";
import { useHistoricoSucursal } from "../mantenimientos/clientes/_hooks/use-historico-sucursal";
import { TablaHistoricoCertificaciones } from "../mantenimientos/clientes/_components/tabla-historico-certificaciones";
import { obtenerSesionActual } from "../../../lib/sesion.servicio";
import type { SesionActual } from "@doonflow/shared";

export default function PaginaMiSucursal() {
  const [sesion, setSesion] = useState<SesionActual | null>(null);
  const [sucursalId, setSucursalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerSesionActual()
      .then((s) => {
        setSesion(s);
        if (s.alcance.tipo === "SUCURSAL" && s.alcance.sucursales.length > 0) {
          setSucursalId(s.alcance.sucursales[0]!.id);
        }
      })
      .catch(() => setError("No se pudo cargar tu sucursal."));
  }, []);

  const { historico, cargando } = useHistoricoSucursal(sucursalId ?? "");

  if (error) {
    return (
      <div className="p-6 md:p-7.5">
        <div className="rounded-[10px] border border-red-light bg-red-light/[0.06] p-8 text-center">
          <p className="text-sm font-medium text-red">{error}</p>
        </div>
      </div>
    );
  }

  if (!sesion || sesion.alcance.tipo !== "SUCURSAL") {
    return (
      <div className="p-6 md:p-7.5">
        <div className="h-4 w-64 animate-pulse rounded bg-gray-2 dark:bg-dark-3" />
      </div>
    );
  }

  const sucursales = sesion.alcance.sucursales;

  return (
    <div className="p-6 md:p-7.5">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-heading-6 font-bold text-dark dark:text-white">Mi sucursal</h1>
        {sucursales.length > 1 && (
          <select
            value={sucursalId ?? ""}
            onChange={(e) => setSucursalId(e.target.value)}
            className="rounded-lg border border-stroke px-3 py-2 text-sm text-dark outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {!cargando && (
        <div className="mb-5 rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-6">
          <p className="text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">
            Certificación vigente
          </p>
          {historico?.puntajeVigente ? (
            <p className="mt-1 text-heading-6 font-bold text-primary">
              {historico.puntajeVigente.puntaje} pts · {historico.puntajeVigente.clasificacion ?? "—"}
            </p>
          ) : (
            <p className="mt-1 text-body-sm text-dark-4 dark:text-dark-6">Sin certificación registrada</p>
          )}
        </div>
      )}

      <TablaHistoricoCertificaciones registros={historico?.registros ?? []} />
    </div>
  );
}
