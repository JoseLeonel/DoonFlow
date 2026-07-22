"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  actualizarHallazgo,
  crearHallazgo,
  generarHallazgosAutomaticos,
  listarHallazgos,
  subirEvidenciaHallazgo,
  type DatosCrearHallazgo,
  type Hallazgo,
} from "../_servicios/hallazgo.servicio";

/** Hallazgos de una certificación (Pantalla 4): lista, alta manual/automática, evidencias. */
export function usarHallazgos(certificacionId: string) {
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    listarHallazgos(certificacionId)
      .then(setHallazgos)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar los hallazgos."))
      .finally(() => setCargando(false));
  }, [certificacionId]);

  useEffect(() => { cargar(); }, [cargar]);

  const crearManual = useCallback(async (datos: DatosCrearHallazgo) => {
    setProcesando(true);
    try {
      const nuevo = await crearHallazgo(certificacionId, datos);
      setHallazgos((actuales) => [...actuales, nuevo]);
      return nuevo;
    } finally {
      setProcesando(false);
    }
  }, [certificacionId]);

  const generarAutomaticos = useCallback(async () => {
    setProcesando(true);
    try {
      const nuevos = await generarHallazgosAutomaticos(certificacionId);
      if (nuevos.length > 0) setHallazgos((actuales) => [...actuales, ...nuevos]);
      return nuevos;
    } finally {
      setProcesando(false);
    }
  }, [certificacionId]);

  const editarSeveridad = useCallback(async (hallazgoId: string, severidad: Hallazgo["severidad"]) => {
    const actualizado = await actualizarHallazgo(hallazgoId, { severidad });
    setHallazgos((actuales) => actuales.map((h) => (h.id === hallazgoId ? actualizado : h)));
    return actualizado;
  }, []);

  const adjuntarEvidencia = useCallback(async (hallazgoId: string, archivo: File) => {
    const evidencia = await subirEvidenciaHallazgo(hallazgoId, archivo);
    setHallazgos((actuales) =>
      actuales.map((h) => (h.id === hallazgoId ? { ...h, evidencias: [...h.evidencias, evidencia] } : h)),
    );
    return evidencia;
  }, []);

  const hayAlMenosUnHallazgo = useMemo(() => hallazgos.length > 0, [hallazgos]);

  return {
    hallazgos, cargando, error, procesando, hayAlMenosUnHallazgo,
    crearManual, generarAutomaticos, editarSeveridad, adjuntarEvidencia,
    recargar: cargar,
  };
}
