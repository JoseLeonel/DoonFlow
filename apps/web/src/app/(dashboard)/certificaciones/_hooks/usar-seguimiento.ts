"use client";

import { useCallback, useEffect, useState } from "react";
import {
  actualizarAvanceAccion,
  enviarAccionARevision,
  listarMisAcciones,
  subirEvidenciaAccion,
  type AccionCorrectiva,
} from "../_servicios/plan-cumplimiento.servicio";

/** Pantalla 6 — "Mis acciones correctivas": avance, evidencias y envío a revisión del responsable. */
export function usarSeguimiento() {
  const [acciones, setAcciones] = useState<AccionCorrectiva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    listarMisAcciones()
      .then(setAcciones)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar tus acciones."))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const actualizarAvance = useCallback(async (accionId: string, porcentajeAvance: number) => {
    const actualizada = await actualizarAvanceAccion(accionId, porcentajeAvance);
    setAcciones((actuales) => actuales.map((a) => (a.id === accionId ? actualizada : a)));
    return actualizada;
  }, []);

  const adjuntarEvidencia = useCallback(async (accionId: string, archivo: File, comentario?: string) => {
    const evidencia = await subirEvidenciaAccion(accionId, archivo, comentario);
    setAcciones((actuales) =>
      actuales.map((a) => (a.id === accionId ? { ...a, evidencias: [...a.evidencias, evidencia] } : a)),
    );
    return evidencia;
  }, []);

  /** Optimista: retira la acción de "pendientes de actualizar" antes de que responda el servidor. */
  const enviarARevision = useCallback(async (accionId: string) => {
    setAcciones((actuales) => actuales.map((a) => (a.id === accionId ? { ...a, estado: "EN_REVISION" } : a)));
    try {
      const actualizada = await enviarAccionARevision(accionId);
      setAcciones((actuales) => actuales.map((a) => (a.id === accionId ? actualizada : a)));
      return actualizada;
    } catch (e) {
      await cargar();
      throw e;
    }
  }, [cargar]);

  return { acciones, cargando, error, actualizarAvance, adjuntarEvidencia, enviarARevision, recargar: cargar };
}
