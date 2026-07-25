"use client";

import { useCallback, useEffect, useState } from "react";
import {
  iniciarAhoraPlanAuditoria,
  listarPlanesAuditoria,
  programarPlanAuditoria,
  reprogramarPlanAuditoria,
  type DatosProgramarPlan,
  type PlanAuditoria,
} from "../_servicios/plan-auditoria.servicio";

/** Estado y acciones del calendario de auditorías: listar, programar, reprogramar, iniciar ahora. */
export function usePlanAuditoria() {
  const [planes, setPlanes] = useState<PlanAuditoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    listarPlanesAuditoria()
      .then(setPlanes)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el calendario de auditorías."))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const programar = useCallback(async (datos: DatosProgramarPlan) => {
    const nuevo = await programarPlanAuditoria(datos);
    setPlanes((actuales) => [...actuales, nuevo].sort((a, b) => a.fechaObjetivo.localeCompare(b.fechaObjetivo)));
    return nuevo;
  }, []);

  const reprogramar = useCallback(async (id: string, fechaObjetivo: string) => {
    const actualizado = await reprogramarPlanAuditoria(id, fechaObjetivo);
    setPlanes((actuales) => actuales.map((p) => (p.id === id ? actualizado : p)));
    return actualizado;
  }, []);

  const iniciarAhora = useCallback((id: string) => iniciarAhoraPlanAuditoria(id), []);

  return { planes, cargando, error, programar, reprogramar, iniciarAhora, recargar: cargar };
}
