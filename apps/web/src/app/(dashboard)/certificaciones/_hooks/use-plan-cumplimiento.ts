"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listarHallazgos, type Hallazgo } from "../_servicios/hallazgo.servicio";
import {
  actualizarAccion,
  cerrarPlan,
  crearAccion,
  generarPlan,
  obtenerPlan,
  reabrirPlan,
  type AccionCorrectiva,
  type DatosCrearAccion,
  type PlanCumplimiento,
} from "../_servicios/plan-cumplimiento.servicio";

/** Plan de cumplimiento de una certificación (Pantallas 5 y 8): acciones, indicadores, cierre. */
export function usePlanCumplimiento(certificacionId: string) {
  const [plan, setPlan] = useState<PlanCumplimiento | null>(null);
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    Promise.all([obtenerPlan(certificacionId), listarHallazgos(certificacionId)])
      .then(([planData, hallazgosData]) => {
        setPlan(planData);
        setHallazgos(hallazgosData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el plan de cumplimiento."))
      .finally(() => setCargando(false));
  }, [certificacionId]);

  useEffect(() => { cargar(); }, [cargar]);

  /** Espejo de `domain/plan-cumplimiento.entity.ts::puedeCerrarse` — la validación real ocurre en el backend. */
  const puedeCerrarse = useMemo(() => {
    if (!plan) return false;
    return hallazgos.every((h) => plan.acciones.some((a) => a.hallazgoId === h.id && a.estado === "CUMPLIDO"));
  }, [plan, hallazgos]);

  const generar = useCallback(async () => {
    setProcesando(true);
    try {
      await generarPlan(certificacionId);
      await cargar();
    } finally {
      setProcesando(false);
    }
  }, [certificacionId, cargar]);

  const crearAccionEnPlan = useCallback(async (datos: DatosCrearAccion) => {
    if (!plan) return;
    setProcesando(true);
    try {
      await crearAccion(plan.id, datos);
      await cargar();
    } finally {
      setProcesando(false);
    }
  }, [plan, cargar]);

  const editarAccion = useCallback(async (accionId: string, datos: Partial<Omit<DatosCrearAccion, "hallazgoId">>) => {
    setProcesando(true);
    try {
      await actualizarAccion(accionId, datos);
      await cargar();
    } finally {
      setProcesando(false);
    }
  }, [cargar]);

  const cerrar = useCallback(async () => {
    if (!plan) return;
    setProcesando(true);
    try {
      await cerrarPlan(plan.id);
      await cargar();
    } finally {
      setProcesando(false);
    }
  }, [plan, cargar]);

  const reabrir = useCallback(async () => {
    if (!plan) return;
    setProcesando(true);
    try {
      await reabrirPlan(plan.id);
      await cargar();
    } finally {
      setProcesando(false);
    }
  }, [plan, cargar]);

  return {
    plan, hallazgos, cargando, error, procesando, puedeCerrarse,
    generar, crearAccionEnPlan, editarAccion, cerrar, reabrir,
    recargar: cargar,
  };
}

export type { AccionCorrectiva };
