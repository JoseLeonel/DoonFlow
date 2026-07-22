"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerResumenCertificacion } from "../_servicios/certificacion.servicio";
import type { ResumenCertificacion } from "../_servicios/certificacion.servicio";

/**
 * Paso final del wizard, sin firma (T-231): resumen por sección + "Guardar y finalizar",
 * que solo navega a la lista — no cambia `estado`, no genera PDF ni código de verificación.
 */
export function usarRevisionCertificacion(certificacionId: string) {
  const router = useRouter();
  const [resumen, setResumen] = useState<ResumenCertificacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    obtenerResumenCertificacion(certificacionId)
      .then(setResumen)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el resumen."))
      .finally(() => setCargando(false));
  }, [certificacionId]);

  useEffect(() => { cargar(); }, [cargar]);

  const haySeccionesIncompletas = useMemo(
    () => (resumen?.porSeccion ?? []).some((s) => s.respondidas < s.total),
    [resumen],
  );

  const guardarYFinalizar = useCallback(() => {
    router.push("/certificaciones");
  }, [router]);

  const volverASeccion = useCallback((seccionId: string) => {
    router.push(`/certificaciones/${certificacionId}/responder?seccionId=${seccionId}`);
  }, [certificacionId, router]);

  return { resumen, cargando, error, haySeccionesIncompletas, guardarYFinalizar, volverASeccion, recargar: cargar };
}
