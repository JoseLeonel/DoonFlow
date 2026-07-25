"use client";

import { useCallback, useEffect, useState } from "react";
import { actualizarPolitica, listarPoliticas } from "../_servicios/retencion.servicio";
import type { AccionAlVencer, PoliticaRetencion, TipoDatoRetencion } from "../_servicios/retencion.servicio";

export function usePoliticaRetencion() {
  const [politicas, setPoliticas] = useState<PoliticaRetencion[]>([]);
  const [cambios, setCambios] = useState<Map<TipoDatoRetencion, { mesesRetencion: number; accionAlVencer: AccionAlVencer }>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setPoliticas(await listarPoliticas());
      setCambios(new Map());
    } catch {
      setError("No se pudo cargar la política de retención.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function editar(tipoDato: TipoDatoRetencion, campo: "mesesRetencion" | "accionAlVencer", valor: number | AccionAlVencer) {
    const actual = politicas.find((p) => p.tipoDato === tipoDato);
    if (!actual) return;
    const base = cambios.get(tipoDato) ?? { mesesRetencion: actual.mesesRetencion, accionAlVencer: actual.accionAlVencer };
    const nuevo = { ...base, [campo]: valor };
    setCambios((prev) => new Map(prev).set(tipoDato, nuevo));
  }

  async function guardarCambios() {
    setGuardando(true);
    setError(null);
    try {
      for (const [tipoDato, datos] of cambios) {
        await actualizarPolitica(tipoDato, datos);
      }
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  }

  const hayCambiosPendientes = cambios.size > 0;

  return { politicas, cambios, cargando, guardando, error, hayCambiosPendientes, editar, guardarCambios };
}
