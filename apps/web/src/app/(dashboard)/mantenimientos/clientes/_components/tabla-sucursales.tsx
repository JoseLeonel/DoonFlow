"use client";

import Link from "next/link";
import { cn } from "@doonflow/shared";
import type { Sucursal } from "../_servicios/sucursal.servicio";

interface PropsTablaSucursales {
  clienteId: string;
  sucursales: Sucursal[];
  cargando: boolean;
  onAgregar: () => void;
  onModificar: (sucursal: Sucursal) => void;
  onToggleEstado: (sucursal: Sucursal) => void;
  soloLectura?: boolean;
}

export function TablaSucursales({
  clienteId,
  sucursales,
  cargando,
  onAgregar,
  onModificar,
  onToggleEstado,
  soloLectura = false,
}: PropsTablaSucursales) {
  return (
    <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-dark-3">
        <h2 className="text-heading-6 font-bold text-dark dark:text-white">Sucursales</h2>
        {!soloLectura && (
          <button
            type="button"
            onClick={onAgregar}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 transition-colors"
          >
            <span className="text-base leading-none">+</span> Agregar sucursal
          </button>
        )}
      </div>

      {cargando ? (
        <EsqueletoTabla />
      ) : sucursales.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-body-sm text-dark-4 dark:text-dark-6">Este cliente no tiene sucursales registradas.</p>
          {!soloLectura && (
            <button
              type="button"
              onClick={onAgregar}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 transition-colors"
            >
              <span className="text-base leading-none">+</span> Agregar primera sucursal
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stroke dark:border-dark-3">
                {["Nombre", "Dirección", "Correo", "Móvil", "Puntaje", "Estado", ""].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke dark:divide-dark-3">
              {sucursales.map((s) => (
                <tr key={s.id} className="hover:bg-gray-1 dark:hover:bg-dark-2 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-dark dark:text-white">{s.nombre}</td>
                  <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{s.direccion ?? "—"}</td>
                  <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{s.correo ?? "—"}</td>
                  <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{s.movil ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    {s.puntajeVigente != null ? (
                      <span className="font-bold text-primary">{s.puntajeVigente}</span>
                    ) : (
                      <span className="text-dark-4 dark:text-dark-6">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <BadgeEstado activo={s.activo} />
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    {!soloLectura && (
                      <>
                        <button
                          type="button"
                          onClick={() => onModificar(s)}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Modificar
                        </button>
                        <span className="mx-2 text-stroke dark:text-dark-3">|</span>
                      </>
                    )}
                    <Link
                      href={`/mantenimientos/clientes/${clienteId}/sucursales/${s.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Ver historial
                    </Link>
                    {!soloLectura && (
                      <>
                        <span className="mx-2 text-stroke dark:text-dark-3">|</span>
                        <button
                          type="button"
                          onClick={() => onToggleEstado(s)}
                          className="text-sm font-medium text-dark-4 hover:underline dark:text-dark-6"
                        >
                          {s.activo ? "Desactivar" : "Activar"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BadgeEstado({ activo }: { activo: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-body-xs font-medium",
        activo
          ? "bg-green-light/[0.08] text-green dark:bg-green/10"
          : "bg-gray-2 text-dark-4 dark:bg-dark-3 dark:text-dark-6",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", activo ? "bg-green" : "bg-dark-4 dark:bg-dark-6")} />
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

function EsqueletoTabla() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stroke dark:border-dark-3">
            {["Nombre", "Dirección", "Correo", "Móvil", "Puntaje", "Estado", ""].map((h) => (
              <th key={h} className="px-5 py-3.5 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stroke dark:divide-dark-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: 7 }).map((__, j) => (
                <td key={j} className="px-5 py-3.5">
                  <div className="h-4 animate-pulse rounded bg-gray-2 dark:bg-dark-3" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
