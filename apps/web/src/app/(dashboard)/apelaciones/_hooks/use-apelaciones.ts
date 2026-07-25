"use client";

import { useCallback, useEffect, useState } from "react";
import { listarApelacionesAbiertas, type Apelacion } from "../_servicios/apelacion.servicio";

/** Pantalla "Resolver apelaciones": lista de apelaciones abiertas, más antigua primero. */
export function useApelaciones() {
  const [apelaciones, setApelaciones] = useState<Apelacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    listarApelacionesAbiertas()
      .then(setApelaciones)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar las apelaciones."))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return { apelaciones, cargando, error, recargar: cargar };
}
