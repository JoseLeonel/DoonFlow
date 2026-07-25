"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanAuditoria } from "@doonflow/shared";
import { usePlanAuditoria } from "./_hooks/use-plan-auditoria";
import { useSucursalesParaPlan } from "./_hooks/use-sucursales-para-plan";
import { TarjetaPlanAuditoria } from "./_components/tarjeta-plan-auditoria";
import { FormularioProgramarAuditoria } from "./_components/formulario-programar-auditoria";

function agruparPorMes(planes: PlanAuditoria[]): { etiqueta: string; planes: PlanAuditoria[] }[] {
  const grupos = new Map<string, PlanAuditoria[]>();
  for (const p of planes) {
    const fecha = new Date(p.fechaObjetivo);
    const clave = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave)!.push(p);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, planes]) => {
      const [anio, mes] = clave.split("-").map(Number);
      const etiqueta = new Date(Date.UTC(anio!, mes! - 1, 1)).toLocaleDateString("es-CR", { month: "long", year: "numeric", timeZone: "UTC" });
      return { etiqueta: etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1), planes };
    });
}

export default function PaginaPlanificacion() {
  const router = useRouter();
  const { planes, cargando, error, programar, iniciarAhora } = usePlanAuditoria();
  const { sucursales } = useSucursalesParaPlan();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const grupos = agruparPorMes(planes);

  const manejarIniciarAhora = async (id: string) => {
    const { redirigirA } = await iniciarAhora(id);
    router.push(redirigirA);
  };

  return (
    <div className="p-6 md:p-7.5">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-heading-6 font-bold text-dark dark:text-white">Planificación de auditorías</h1>
          <p className="text-body-sm text-dark-4 dark:text-dark-6">Certificaciones programadas por sucursal</p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarFormulario((v) => !v)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
        >
          + Programar certificación
        </button>
      </div>

      {mostrarFormulario && (
        <FormularioProgramarAuditoria
          sucursales={sucursales}
          onGuardar={async (datos) => { await programar(datos); setMostrarFormulario(false); }}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {error && <p className="mb-4 text-body-sm text-red">{error}</p>}

      {cargando ? (
        <div className="rounded-[10px] bg-white p-8 text-center text-body-sm text-dark-4 shadow-1 dark:bg-gray-dark dark:text-dark-6 dark:shadow-card">
          Cargando...
        </div>
      ) : grupos.length === 0 ? (
        <div className="rounded-[10px] bg-white p-12 text-center shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm text-dark-4 dark:text-dark-6">No hay certificaciones programadas.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((grupo) => (
            <div key={grupo.etiqueta}>
              <h2 className="mb-2 text-body-sm font-semibold text-dark dark:text-white">{grupo.etiqueta}</h2>
              <div className="divide-y divide-stroke rounded-[10px] bg-white shadow-1 dark:divide-dark-3 dark:bg-gray-dark dark:shadow-card">
                {grupo.planes.map((p) => (
                  <TarjetaPlanAuditoria key={p.id} plan={p} onIniciarAhora={manejarIniciarAhora} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
