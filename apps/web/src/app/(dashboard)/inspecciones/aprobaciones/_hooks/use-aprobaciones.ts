"use client";

import { useCallback, useEffect, useState } from "react";
import {
  aprobarPlantilla,
  listarPendientesAprobacion,
  rechazarPlantilla,
} from "../../_servicios/inspeccion.servicio";
import type { Plantilla } from "../../_servicios/inspeccion.servicio";

/** Cola de aprobación de plantillas (007-gobernanza-permisos-aprobacion). */
export function useAprobaciones() {
  const [pendientes, setPendientes] = useState<Plantilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await listarPendientesAprobacion();
      setPendientes(r.items);
    } catch {
      setError("No se pudo cargar la lista de plantillas pendientes.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const aprobar = async (id: string) => {
    setProcesandoId(id);
    setError(null);
    try {
      await aprobarPlantilla(id);
      setPendientes((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo aprobar la plantilla.");
    } finally {
      setProcesandoId(null);
    }
  };

  const rechazar = async (id: string, comentario: string) => {
    setProcesandoId(id);
    setError(null);
    try {
      await rechazarPlantilla(id, comentario);
      setPendientes((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo rechazar la plantilla.");
    } finally {
      setProcesandoId(null);
    }
  };

  return { pendientes, cargando, procesandoId, error, aprobar, rechazar, recargar: cargar };
}
