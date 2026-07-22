"use client";

import Link from "next/link";
import { cn } from "@doonflow/shared";
import type { Cliente } from "../_servicios/cliente.servicio";

interface PropsTablaClientes {
  clientes: Cliente[];
  cargando: boolean;
}

export function TablaClientes({ clientes, cargando }: PropsTablaClientes) {
  if (cargando) return <EsqueletoTabla />;

  if (clientes.length === 0) {
    return (
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-12 text-center">
        <p className="text-body-sm text-dark-4 dark:text-dark-6">No hay clientes registrados.</p>
        <Link
          href="/mantenimientos/clientes/nuevo"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 transition-colors"
        >
          <span className="text-base leading-none">+</span> Agregar primer cliente
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3">
              {["Empresa", "Responsable", "Identificación", "Correo principal", "Estado", ""].map((h) => (
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
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-gray-1 dark:hover:bg-dark-2 transition-colors">
                <td className="px-5 py-3.5 font-medium text-dark dark:text-white">{c.empresa}</td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{c.nombreResponsable}</td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{c.identificacionEmpresa ?? "—"}</td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{c.correo1}</td>
                <td className="px-5 py-3.5">
                  <BadgeEstado activo={c.activo} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/mantenimientos/clientes/${c.id}/editar`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Modificar
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
    <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3">
              {["Empresa", "Responsable", "Identificación", "Correo principal", "Estado", ""].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke dark:divide-dark-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <td key={j} className="px-5 py-3.5">
                    <div className="h-4 animate-pulse rounded bg-gray-2 dark:bg-dark-3" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
