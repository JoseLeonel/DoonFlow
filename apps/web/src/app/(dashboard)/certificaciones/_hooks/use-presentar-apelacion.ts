"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PLAZO_APELACION_DIAS } from "@doonflow/shared";
import { obtenerCertificacion } from "../_servicios/certificacion.servicio";
import { listarHallazgos, type Hallazgo } from "../_servicios/hallazgo.servicio";
import { presentarApelacion, type DatosPresentarApelacion } from "../../apelaciones/_servicios/apelacion.servicio";

/** Página "Presentar apelación" (`/certificaciones/[id]/apelacion/nueva`, HU-2). */
export function usePresentarApelacion(certificacionId: string) {
  const router = useRouter();
  const [firmadoEn, setFirmadoEn] = useState<string | null>(null);
  const [hallazgosActivos, setHallazgosActivos] = useState<Hallazgo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useEffect(() => {
    setCargando(true);
    setError(null);
    Promise.all([obtenerCertificacion(certificacionId), listarHallazgos(certificacionId)])
      .then(([certificacion, hallazgos]) => {
        setFirmadoEn(certificacion.firmadoEn);
        setHallazgosActivos(hallazgos.filter((h) => h.estado === "ACTIVO"));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar la certificación."))
      .finally(() => setCargando(false));
  }, [certificacionId]);

  const diasRestantes = useMemo(() => {
    if (!firmadoEn) return null;
    const limite = new Date(firmadoEn);
    limite.setDate(limite.getDate() + PLAZO_APELACION_DIAS);
    const dias = Math.ceil((limite.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return { dias, fechaLimite: limite };
  }, [firmadoEn]);

  const plazoVencido = diasRestantes !== null && diasRestantes.dias < 0;

  const enviar = useCallback(async (datos: Omit<DatosPresentarApelacion, "inspeccionId">) => {
    setGuardando(true);
    setErrorEnvio(null);
    try {
      await presentarApelacion({ ...datos, inspeccionId: certificacionId });
      router.push(`/certificaciones/${certificacionId}/revision`);
    } catch (e) {
      setErrorEnvio(e instanceof Error ? e.message : "No se pudo presentar la apelación.");
      throw e;
    } finally {
      setGuardando(false);
    }
  }, [certificacionId, router]);

  return { hallazgosActivos, cargando, error, diasRestantes, plazoVencido, guardando, errorEnvio, enviar };
}
