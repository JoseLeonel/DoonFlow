"use client";

import { useEffect, useState } from "react";
import type { HallazgoFrecuente } from "@doonflow/shared";
import { listarHallazgosFrecuentesActivos } from "../_servicios/hallazgo-frecuente.servicio";

/** Biblioteca de hallazgos frecuentes activos para el selector del wizard (014-panel-calendario-biblioteca). */
export function useHallazgosFrecuentesActivos() {
  const [items, setItems] = useState<HallazgoFrecuente[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    listarHallazgosFrecuentesActivos()
      .then(setItems)
      .finally(() => setCargando(false));
  }, []);

  return { items, cargando };
}
