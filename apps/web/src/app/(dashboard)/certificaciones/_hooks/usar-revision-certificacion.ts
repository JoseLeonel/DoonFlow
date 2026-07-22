"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerCertificacion, obtenerResumenCertificacion, firmarCertificacion } from "../_servicios/certificacion.servicio";
import type { CertificacionCompleta, ResumenCertificacion } from "../_servicios/certificacion.servicio";
import { listarHallazgos, type Hallazgo } from "../_servicios/hallazgo.servicio";
import { obtenerPlan } from "../_servicios/plan-cumplimiento.servicio";

/**
 * Paso final del wizard. "Guardar y finalizar" (015, sin firma) sigue disponible tal cual —
 * solo navega a la lista, no cambia `estado`. "Firmar y certificar" (005, retomado) es la
 * acción nueva: cierra la certificación, genera código de verificación y PDF.
 * 013-hallazgos-plan-cumplimiento amplía `puedeFirmar` para bloquear el botón cuando hay un
 * hallazgo CRITICA sin ninguna acción correctiva CUMPLIDO (antes solo miraba `estado`).
 */
export function usarRevisionCertificacion(certificacionId: string) {
  const router = useRouter();
  const [resumen, setResumen] = useState<ResumenCertificacion | null>(null);
  const [certificacion, setCertificacion] = useState<CertificacionCompleta | null>(null);
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [hallazgoIdsConAccionCumplida, setHallazgoIdsConAccionCumplida] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firmando, setFirmando] = useState(false);
  const [errorFirma, setErrorFirma] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    Promise.all([
      obtenerResumenCertificacion(certificacionId),
      obtenerCertificacion(certificacionId),
      listarHallazgos(certificacionId),
      obtenerPlan(certificacionId),
    ])
      .then(([resumenData, certificacionData, hallazgosData, plan]) => {
        setResumen(resumenData);
        setCertificacion(certificacionData);
        setHallazgos(hallazgosData);
        setHallazgoIdsConAccionCumplida(
          new Set((plan?.acciones ?? []).filter((a) => a.estado === "CUMPLIDO").map((a) => a.hallazgoId)),
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el resumen."))
      .finally(() => setCargando(false));
  }, [certificacionId]);

  useEffect(() => { cargar(); }, [cargar]);

  const haySeccionesIncompletas = useMemo(
    () => (resumen?.porSeccion ?? []).some((s) => s.respondidas < s.total),
    [resumen],
  );

  const hayHallazgoCriticoSinResolver = useMemo(
    () => hallazgos.some((h) => h.severidad === "CRITICA" && !hallazgoIdsConAccionCumplida.has(h.id)),
    [hallazgos, hallazgoIdsConAccionCumplida],
  );

  const puedeFirmar = certificacion?.estado === "EN_PROGRESO" && !hayHallazgoCriticoSinResolver;

  const firmar = useCallback(async (pendientesSincronizacion: number) => {
    setFirmando(true);
    setErrorFirma(null);
    try {
      const actualizada = await firmarCertificacion(certificacionId, pendientesSincronizacion);
      setCertificacion((anterior) => (anterior ? { ...anterior, ...actualizada } : anterior));
    } catch (e) {
      setErrorFirma(e instanceof Error ? e.message : "No se pudo firmar la certificación.");
    } finally {
      setFirmando(false);
    }
  }, [certificacionId]);

  const guardarYFinalizar = useCallback(() => {
    router.push("/certificaciones");
  }, [router]);

  const volverASeccion = useCallback((seccionId: string) => {
    router.push(`/certificaciones/${certificacionId}/responder?seccionId=${seccionId}`);
  }, [certificacionId, router]);

  return {
    resumen,
    certificacion,
    hallazgos,
    hayHallazgoCriticoSinResolver,
    cargando,
    error,
    haySeccionesIncompletas,
    puedeFirmar,
    firmando,
    errorFirma,
    firmar,
    guardarYFinalizar,
    volverASeccion,
    recargar: cargar,
  };
}
