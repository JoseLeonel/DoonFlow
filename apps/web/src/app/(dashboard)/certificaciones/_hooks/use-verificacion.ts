"use client";

import { useCallback, useEffect, useState } from "react";
import { listarAccionesEnRevision, verificarAccion, type AccionCorrectiva } from "../_servicios/plan-cumplimiento.servicio";

/** Pantalla 7 — "Verificación de acciones": el auditor marca cumplido/no cumplido. */
export function useVerificacion() {
  const [acciones, setAcciones] = useState<AccionCorrectiva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    listarAccionesEnRevision()
      .then(setAcciones)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar las acciones en revisión."))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const verificar = useCallback(async (
    accionId: string,
    resultado: "CUMPLIDO" | "NO_CUMPLIDO",
    comentario: string,
    nuevaFechaLimite?: string,
  ) => {
    const actualizada = await verificarAccion(accionId, resultado, comentario, nuevaFechaLimite);
    setAcciones((actuales) => actuales.filter((a) => a.id !== accionId));
    return actualizada;
  }, []);

  return { acciones, cargando, error, verificar, recargar: cargar };
}
