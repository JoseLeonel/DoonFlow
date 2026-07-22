"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usarHistoricoSucursal } from "../../../_hooks/usar-historico-sucursal";
import { TablaHistoricoCertificaciones } from "../../../_components/tabla-historico-certificaciones";
import { obtenerCliente } from "../../../_servicios/cliente.servicio";
import { obtenerSucursal } from "../../../_servicios/sucursal.servicio";
import type { Cliente } from "../../../_servicios/cliente.servicio";
import type { Sucursal } from "../../../_servicios/sucursal.servicio";

export default function PaginaHistoricoSucursal({
  params,
}: {
  params: { id: string; sucursalId: string };
}) {
  const { historico, cargando, error } = usarHistoricoSucursal(params.sucursalId);
  const [cliente,   setCliente]   = useState<Cliente | null>(null);
  const [sucursal,  setSucursal]  = useState<Sucursal | null>(null);

  useEffect(() => {
    obtenerCliente(params.id).then(setCliente).catch(() => {});
    obtenerSucursal(params.sucursalId).then(setSucursal).catch(() => {});
  }, [params.id, params.sucursalId]);

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/mantenimientos" className="hover:text-primary">Mantenimientos</Link>
        <span className="mx-1.5">/</span>
        <Link href="/mantenimientos/clientes" className="hover:text-primary">Clientes</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/mantenimientos/clientes/${params.id}/editar`} className="hover:text-primary">
          {cliente?.empresa ?? "…"}
        </Link>
        <span className="mx-1.5">/</span>
        <span>{sucursal?.nombre ?? "…"}</span>
        <span className="mx-1.5">/</span>
        <span>Historial</span>
      </nav>

      <h1 className="mb-6 text-heading-6 font-bold text-dark dark:text-white">
        Historial de certificaciones{sucursal ? ` — ${sucursal.nombre}` : ""}
      </h1>

      {cargando ? (
        <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-8">
          <div className="h-4 w-64 animate-pulse rounded bg-gray-2 dark:bg-dark-3" />
        </div>
      ) : error ? (
        <div className="rounded-[10px] border border-red-light bg-red-light/[0.06] p-8 text-center">
          <p className="text-sm font-medium text-red">{error}</p>
        </div>
      ) : (
        <>
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

          <TablaHistoricoCertificaciones registros={historico?.registros ?? []} />
        </>
      )}
    </div>
  );
}
