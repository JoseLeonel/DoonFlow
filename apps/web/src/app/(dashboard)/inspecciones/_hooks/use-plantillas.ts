"use client";

import { useCallback, useEffect, useState } from "react";
import type { Plantilla } from "../_servicios/inspeccion.servicio";

export function usePlantillas(token: string) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/inspeccion/plantillas");
      const json = await res.json();
      setPlantillas(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch {
      setError("No se pudo cargar la lista de plantillas.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleEstado = async (id: string, activar: boolean) => {
    const accion = activar ? "activar" : "desactivar";
    await fetch(`/api/inspeccion/plantillas/${id}/${accion}`, { method: "POST" });
    setPlantillas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, activa: activar } : p)),
    );
  };

  const clonar = async (id: string, nombre: string) => {
    await fetch(`/api/inspeccion/plantillas/${id}/clonar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    await cargar();
  };

  return { plantillas, total, cargando, error, recargar: cargar, toggleEstado, clonar };
}
