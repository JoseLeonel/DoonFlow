"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerApelacion, resolverApelacion, type Apelacion } from "../_servicios/apelacion.servicio";

/** Página de detalle `/apelaciones/[id]`: carga la apelación y expone la acción de resolverla. */
export function useResolverApelacion(id: string) {
  const [apelacion, setApelacion] = useState<Apelacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorResolver, setErrorResolver] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    obtenerApelacion(id)
      .then(setApelacion)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar la apelación."))
      .finally(() => setCargando(false));
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const resolver = useCallback(async (estado: "ACEPTADA" | "RECHAZADA", resolucionComentario: string) => {
    setGuardando(true);
    setErrorResolver(null);
    try {
      const actualizada = await resolverApelacion(id, { estado, resolucionComentario });
      setApelacion(actualizada);
      return actualizada;
    } catch (e) {
      setErrorResolver(e instanceof Error ? e.message : "No se pudo resolver la apelación.");
      throw e;
    } finally {
      setGuardando(false);
    }
  }, [id]);

  return { apelacion, cargando, error, guardando, errorResolver, resolver, recargar: cargar };
}
