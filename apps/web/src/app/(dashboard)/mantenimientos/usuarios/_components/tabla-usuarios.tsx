"use client";

import Link from "next/link";
import { cn, ROL_ADMIN, ROL_ADMINISTRADOR_CLIENTE, ROL_USUARIO_SUCURSAL } from "@doonflow/shared";
import type { UsuarioConAlcance } from "../_servicios/usuario.servicio";

const ETIQUETA_ROL: Record<string, string> = {
  administrador: "Administrador general",
  administrador_cliente: "Administrador de cliente",
  usuario_sucursal: "Usuario de sucursal",
  productor: "Productor",
  operario: "Operario",
  auditor: "Auditor",
  cliente_externo: "Cliente externo",
};

function textoAlcance(u: UsuarioConAlcance): string {
  if (u.rolNombre === ROL_ADMIN) return "Todos";
  if (u.rolNombre === ROL_ADMINISTRADOR_CLIENTE) return u.clienteNombre ?? "—";
  if (u.rolNombre === ROL_USUARIO_SUCURSAL) {
    if (!u.sucursalNombre) return u.sucursalesAdicionales[0]?.nombre ?? "—";
    const extra = u.sucursalesAdicionales.length;
    return extra > 0 ? `${u.sucursalNombre} y ${extra} más` : u.sucursalNombre;
  }
  return "—";
}

interface PropsTablaUsuarios {
  usuarios: UsuarioConAlcance[];
  cargando: boolean;
}

export function TablaUsuarios({ usuarios, cargando }: PropsTablaUsuarios) {
  if (cargando) return <EsqueletoTabla />;

  if (usuarios.length === 0) {
    return (
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-12 text-center">
        <p className="text-body-sm text-dark-4 dark:text-dark-6">No hay usuarios registrados.</p>
        <Link
          href="/mantenimientos/usuarios/nuevo"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 transition-colors"
        >
          <span className="text-base leading-none">+</span> Agregar primer usuario
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
              {["Nombre", "Correo", "Rol", "Alcance", "Estado", ""].map((h) => (
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
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-1 dark:hover:bg-dark-2 transition-colors">
                <td className="px-5 py-3.5 font-medium text-dark dark:text-white">{u.nombre}</td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{u.email}</td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{ETIQUETA_ROL[u.rolNombre] ?? u.rolNombre}</td>
                <td className="px-5 py-3.5 text-dark-4 dark:text-dark-6">{textoAlcance(u)}</td>
                <td className="px-5 py-3.5">
                  <BadgeEstado activo={u.activo} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/mantenimientos/usuarios/${u.id}/editar`}
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
              {["Nombre", "Correo", "Rol", "Alcance", "Estado", ""].map((h) => (
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
