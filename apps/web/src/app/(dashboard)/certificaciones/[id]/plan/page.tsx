"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usarPlanCumplimiento } from "../../_hooks/usar-plan-cumplimiento";
import { IndicadoresPlan } from "../../_components/indicadores-plan";
import { TablaPlanCumplimiento } from "../../_components/tabla-plan-cumplimiento";
import { listarUsuarios, type UsuarioConAlcance } from "../../../mantenimientos/usuarios/_servicios/usuario.servicio";

export default function PaginaPlanCumplimiento() {
  const { id } = useParams<{ id: string }>();
  const { plan, hallazgos, cargando, error, procesando, puedeCerrarse, generar, crearAccionEnPlan, cerrar, reabrir } =
    usarPlanCumplimiento(id);
  const [hallazgoSeleccionado, setHallazgoSeleccionado] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioConAlcance[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");

  useEffect(() => {
    listarUsuarios().then(setUsuarios).catch(() => setUsuarios([]));
  }, []);

  const agregarAccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hallazgoSeleccionado || !responsableId || !fechaLimite) return;
    await crearAccionEnPlan({ hallazgoId: hallazgoSeleccionado, descripcion, responsableId, fechaLimite });
    setHallazgoSeleccionado(null);
    setDescripcion("");
    setResponsableId("");
    setFechaLimite("");
  };

  if (cargando) {
    return <p className="p-8 text-body-sm text-dark-4 dark:text-dark-6">Cargando...</p>;
  }

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-4 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/certificaciones" className="hover:text-primary">Certificaciones</Link>
        <span className="mx-1.5">/</span>
        <span>Plan de cumplimiento</span>
      </nav>

      <div className="mx-auto max-w-[960px]">
        {error && <p className="mb-4 text-body-sm text-red">{error}</p>}

        {!plan ? (
          <div className="rounded-[10px] bg-white p-8 text-center shadow-1 dark:bg-gray-dark dark:shadow-card">
            <p className="mb-4 text-body-sm text-dark-4 dark:text-dark-6">
              Esta certificación todavía no tiene un plan de cumplimiento.
            </p>
            <button
              type="button"
              disabled={procesando || hallazgos.length === 0}
              onClick={() => generar()}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              Generar plan de cumplimiento
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-heading-6 font-bold text-dark dark:text-white">Plan de cumplimiento</h1>
              <span className={`text-body-xs font-medium ${plan.estado === "CERRADO" ? "text-dark-4" : "text-green"}`}>
                ● {plan.estado === "EN_SEGUIMIENTO" ? "En seguimiento" : plan.estado === "CERRADO" ? "Cerrado" : "Reabierto"}
              </span>
            </div>

            <IndicadoresPlan indicadores={plan.indicadores} />

            <div className="mb-4 overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
              <TablaPlanCumplimiento
                hallazgos={hallazgos}
                acciones={plan.acciones}
                planCerrado={plan.estado === "CERRADO"}
                onAgregarAccion={setHallazgoSeleccionado}
              />
            </div>

            {hallazgoSeleccionado && (
              <form onSubmit={agregarAccion} className="mb-4 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark dark:shadow-card">
                <h3 className="mb-3 text-body-sm font-semibold text-dark dark:text-white">Nueva acción correctiva</h3>
                <input
                  type="text"
                  placeholder="Descripción de la acción"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                />
                <select
                  value={responsableId}
                  onChange={(e) => setResponsableId(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                >
                  <option value="">Seleccionar responsable...</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={fechaLimite}
                  onChange={(e) => setFechaLimite(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setHallazgoSeleccionado(null)} className="rounded-lg border border-stroke px-4 py-2 text-sm text-dark dark:border-dark-3 dark:text-white">
                    Cancelar
                  </button>
                  <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">
                    Agregar acción
                  </button>
                </div>
              </form>
            )}

            {plan.estado !== "CERRADO" ? (
              <div className="flex flex-col items-end gap-2">
                {!puedeCerrarse && (
                  <p className="text-body-xs text-yellow-dark">
                    No se puede cerrar: hay hallazgos sin ninguna acción cumplida.
                  </p>
                )}
                <button
                  type="button"
                  disabled={!puedeCerrarse || procesando}
                  onClick={() => cerrar()}
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cerrar plan
                </button>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={procesando}
                  onClick={() => reabrir()}
                  className="rounded-lg border border-stroke px-6 py-2.5 text-sm font-medium text-dark hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                >
                  Reabrir plan
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
