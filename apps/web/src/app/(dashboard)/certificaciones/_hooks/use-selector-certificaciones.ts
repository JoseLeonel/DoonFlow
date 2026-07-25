"use client";

import { useEffect, useState } from "react";
import { listarCertificaciones } from "../_servicios/certificacion.servicio";
import type { Certificacion } from "../_servicios/certificacion.servicio";

/**
 * Certificaciones que ya pueden tener hallazgos/plan de cumplimiento (`FINALIZADA`/`FIRMADA` —
 * `EN_PROGRESO` nunca los tiene) — usado por el selector de "Verificación" para saltar
 * directo al plan de una certificación elegida sin navegar Certificaciones → Hallazgos → Plan.
 */
export function useSelectorCertificaciones() {
  const [certificaciones, setCertificaciones] = useState<Certificacion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    listarCertificaciones({ porPagina: 200 })
      .then(({ items }) => setCertificaciones(items.filter((c) => c.estado !== "EN_PROGRESO")))
      .catch(() => setCertificaciones([]))
      .finally(() => setCargando(false));
  }, []);

  return { certificaciones, cargando };
}
