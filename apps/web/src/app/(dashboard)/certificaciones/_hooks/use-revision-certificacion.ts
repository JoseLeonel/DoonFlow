"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PLAZO_APELACION_DIAS } from "@doonflow/shared";
import { obtenerCertificacion, obtenerResumenCertificacion, firmarCertificacion, finalizarCertificacion, aceptarCertificacion } from "../_servicios/certificacion.servicio";
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
export function useRevisionCertificacion(certificacionId: string) {
  const router = useRouter();
  const [resumen, setResumen] = useState<ResumenCertificacion | null>(null);
  const [certificacion, setCertificacion] = useState<CertificacionCompleta | null>(null);
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [hallazgoIdsConAccionCumplida, setHallazgoIdsConAccionCumplida] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firmando, setFirmando] = useState(false);
  const [errorFirma, setErrorFirma] = useState<string | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [errorFinalizar, setErrorFinalizar] = useState<string | null>(null);
  const [aceptando, setAceptando] = useState(false);
  const [errorAceptar, setErrorAceptar] = useState<string | null>(null);

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
  /** A diferencia de firmar, finalizar (cierre liviano) no exige ausencia de hallazgo crítico. */
  const puedeFinalizar = certificacion?.estado === "EN_PROGRESO";

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

  const guardarYFinalizar = useCallback(async (pendientesSincronizacion: number) => {
    setFinalizando(true);
    setErrorFinalizar(null);
    try {
      const actualizada = await finalizarCertificacion(certificacionId, pendientesSincronizacion);
      setCertificacion((anterior) => (anterior ? { ...anterior, ...actualizada } : anterior));
    } catch (e) {
      setErrorFinalizar(e instanceof Error ? e.message : "No se pudo finalizar la certificación.");
    } finally {
      setFinalizando(false);
    }
  }, [certificacionId]);

  // 011-aceptacion-apelaciones-certificacion — reconocimiento informativo del cliente.
  const pendienteDeAceptacion = certificacion?.estado === "FIRMADA" && certificacion.aceptadoEn === null;

  /**
   * Espejo de `apelaciones/domain/apelacion.entity.ts::puedeApelar` — el botón para presentar
   * apelación solo aparecía dentro de la ventana de `pendienteDeAceptacion`, así que una vez el
   * cliente aceptaba (o recargaba la página) desaparecía sin que el backend dejara de admitirla
   * dentro del plazo. Se calcula aparte para que el enlace siga visible mientras el plazo esté
   * vigente, haya aceptado o no.
   */
  const puedeApelar = useMemo(() => {
    if (!certificacion || certificacion.estado !== "FIRMADA" || !certificacion.firmadoEn) return false;
    const ahora = new Date();
    if (certificacion.fechaVencimiento && new Date(certificacion.fechaVencimiento) < ahora) return false;
    const limite = new Date(certificacion.firmadoEn);
    limite.setDate(limite.getDate() + PLAZO_APELACION_DIAS);
    return ahora.getTime() <= limite.getTime();
  }, [certificacion]);

  const aceptar = useCallback(async () => {
    setAceptando(true);
    setErrorAceptar(null);
    try {
      const actualizada = await aceptarCertificacion(certificacionId);
      setCertificacion((anterior) => (anterior ? { ...anterior, ...actualizada } : anterior));
    } catch (e) {
      setErrorAceptar(e instanceof Error ? e.message : "No se pudo aceptar la certificación.");
    } finally {
      setAceptando(false);
    }
  }, [certificacionId]);

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
    puedeFinalizar,
    finalizando,
    errorFinalizar,
    guardarYFinalizar,
    volverASeccion,
    pendienteDeAceptacion,
    puedeApelar,
    aceptando,
    errorAceptar,
    aceptar,
    recargar: cargar,
  };
}
