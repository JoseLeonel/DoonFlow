"use client";

import { cn } from "@doonflow/shared";
import type { MatrizPermisos } from "../_servicios/permisos.servicio";

const ETIQUETA_ROL: Record<string, string> = {
  administrador: "Administrador general",
  productor: "Productor",
  operario: "Operario",
  auditor: "Auditor",
  cliente_externo: "Cliente externo",
  administrador_cliente: "Administrador de cliente",
  usuario_sucursal: "Usuario de sucursal",
};

interface PropsTablaMatrizPermisos {
  matriz: MatrizPermisos;
  onToggle: (rolId: string, permisoId: string) => void;
}

/** Agrupa los permisos por el prefijo del código antes del primer punto (ej. "plantillas.*"). */
function agruparPermisos(permisos: MatrizPermisos["permisos"]) {
  const grupos = new Map<string, MatrizPermisos["permisos"]>();
  for (const p of permisos) {
    const grupo = p.codigo.split(".")[0]!;
    grupos.set(grupo, [...(grupos.get(grupo) ?? []), p]);
  }
  return Array.from(grupos.entries());
}

export function TablaMatrizPermisos({ matriz, onToggle }: PropsTablaMatrizPermisos) {
  const grupos = agruparPermisos(matriz.permisos);

  return (
    <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3">
              <th className="px-5 py-3.5 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">Rol</th>
              {grupos.map(([grupo, permisos]) => (
                <th key={grupo} colSpan={permisos.length} className="px-5 py-2 text-center text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">
                  {grupo}
                </th>
              ))}
            </tr>
            <tr className="border-b border-stroke dark:border-dark-3">
              <th />
              {grupos.flatMap(([, permisos]) => permisos).map((p) => (
                <th key={p.id} title={p.descripcion ?? undefined} className="px-3 py-2 text-center text-body-xs font-medium text-dark-4 dark:text-dark-6">
                  {p.codigo.split(".").slice(1).join(".")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matriz.roles.map((rol) => (
              <tr
                key={rol.id}
                className={cn(
                  "border-b border-stroke last:border-0 dark:border-dark-3",
                  !rol.editable && "bg-gray-1/60 dark:bg-dark-2/60",
                )}
              >
                <td className="px-5 py-3 font-medium text-dark dark:text-white">
                  {ETIQUETA_ROL[rol.nombre] ?? rol.nombre}
                </td>
                {grupos.flatMap(([, permisos]) => permisos).map((permiso) => (
                  <td key={permiso.id} className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={rol.permisoIds.includes(permiso.id)}
                      disabled={!rol.editable}
                      title={!rol.editable ? "El rol administrador siempre tiene todos los permisos." : undefined}
                      onChange={() => onToggle(rol.id, permiso.id)}
                      className={cn("h-4 w-4 accent-primary", !rol.editable && "cursor-not-allowed")}
                    />
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
