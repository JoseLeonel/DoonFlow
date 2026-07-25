"use client";

import { useEffect, useState } from "react";
import { listarApelacionesDeInspeccion, type Apelacion } from "../../apelaciones/_servicios/apelacion.servicio";

/** Historial de apelaciones de una certificación (cualquier estado), mostrado en su detalle. */
export function useHistorialApelaciones(certificacionId: string) {
  const [apelaciones, setApelaciones] = useState<Apelacion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    listarApelacionesDeInspeccion(certificacionId)
      .then(setApelaciones)
      .catch(() => setApelaciones([]))
      .finally(() => setCargando(false));
  }, [certificacionId]);

  return { apelaciones, cargando };
}
