"use client";

import { useCallback, useEffect, useState } from "react";
import {
  activarHallazgoFrecuente,
  crearHallazgoFrecuente,
  desactivarHallazgoFrecuente,
  listarHallazgosFrecuentes,
  actualizarHallazgoFrecuente,
  type DatosHallazgoFrecuente,
  type HallazgoFrecuente,
} from "../_servicios/hallazgo-frecuente.servicio";

export function useHallazgosFrecuentes() {
  const [hallazgosFrecuentes, setHallazgosFrecuentes] = useState<HallazgoFrecuente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    listarHallazgosFrecuentes()
      .then(setHallazgosFrecuentes)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar la biblioteca."))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = useCallback(async (datos: DatosHallazgoFrecuente) => {
    const nuevo = await crearHallazgoFrecuente(datos);
    setHallazgosFrecuentes((actuales) => [...actuales, nuevo]);
    return nuevo;
  }, []);

  const actualizar = useCallback(async (id: string, datos: Partial<DatosHallazgoFrecuente>) => {
    const actualizado = await actualizarHallazgoFrecuente(id, datos);
    setHallazgosFrecuentes((actuales) => actuales.map((h) => (h.id === id ? actualizado : h)));
    return actualizado;
  }, []);

  const alternarActivo = useCallback(async (id: string, activoActual: boolean) => {
    const actualizado = activoActual ? await desactivarHallazgoFrecuente(id) : await activarHallazgoFrecuente(id);
    setHallazgosFrecuentes((actuales) => actuales.map((h) => (h.id === id ? actualizado : h)));
    return actualizado;
  }, []);

  return { hallazgosFrecuentes, cargando, error, crear, actualizar, alternarActivo, recargar: cargar };
}
