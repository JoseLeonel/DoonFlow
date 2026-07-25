"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEstadoConexion } from "../../../../lib/offline/estado-conexion";
import {
  procesarColaSincronizacion,
  marcarModificacionLocal,
  obtenerMetadatoCertificacion,
} from "../../../../lib/offline/cola-sincronizacion";
import type { ClienteSincronizacion } from "../../../../lib/offline/cola-sincronizacion";
import {
  guardarRespuestaLocal,
  contarRespuestasPendientes,
} from "../../../../lib/offline/respuestas-offline.store";
import type { DatosRespuestaOffline, RespuestaOffline } from "../../../../lib/offline/respuestas-offline.store";
import {
  guardarEvidenciaLocal,
  contarEvidenciasPendientes,
} from "../../../../lib/offline/evidencias-offline.store";
import type { EvidenciaOffline } from "../../../../lib/offline/evidencias-offline.store";
import { sincronizarLote, subirEvidenciaPendiente } from "../_servicios/certificacion.servicio";

/** `null` = nada que comunicar — el banner no se muestra (ver impl.md → Diseño del indicador). */
export type EstadoSincronizacion = "DESCONECTADO" | "SINCRONIZANDO" | "SINCRONIZADO" | "ERROR_PARCIAL" | null;

const UMBRAL_ALERTA_HORAS = 24;
const VENTANA_CONFIRMACION_MS = 4000;

const clienteSincronizacion: ClienteSincronizacion = {
  sincronizarLote: (inspeccionId, capturaOffline, respuestas: RespuestaOffline[]) =>
    sincronizarLote(
      inspeccionId,
      capturaOffline,
      respuestas.map((r) => ({
        nodoId: r.nodoId,
        valor: r.valor,
        valores: r.valores,
        comentarioReconocimiento: r.comentarioReconocimiento,
        comentarioObservacion: r.comentarioObservacion,
        comentarioOportunidadMejora: r.comentarioOportunidadMejora,
        capturadoEnCliente: r.capturadoEnCliente,
      })),
    ),
  subirEvidencia: (inspeccionId, evidencia: EvidenciaOffline) =>
    subirEvidenciaPendiente(inspeccionId, evidencia.nodoIdRelacionado, evidencia.nombreArchivo, evidencia.blob),
};

/**
 * Orquesta captura offline para una certificación: escritura local inmediata en IndexedDB +
 * sincronización en segundo plano cuando hay conexión (012-captura-offline-campo).
 */
export function useCapturaOffline(inspeccionId: string) {
  const estadoConexion = useEstadoConexion();
  const [pendientes, setPendientes] = useState(0);
  const [alertaDatosAntiguos, setAlertaDatosAntiguos] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [huboFalla, setHuboFalla] = useState(false);
  const [confirmacionVisible, setConfirmacionVisible] = useState(false);
  const sincronizandoRef = useRef(false);
  const estadoConexionAnteriorRef = useRef(estadoConexion);

  const refrescarPendientes = useCallback(async () => {
    const [respuestas, evidencias] = await Promise.all([
      contarRespuestasPendientes(inspeccionId),
      contarEvidenciasPendientes(inspeccionId),
    ]);
    const total = respuestas + evidencias;
    setPendientes(total);

    const metadato = await obtenerMetadatoCertificacion(inspeccionId);
    if (metadato && total > 0) {
      const horas = (Date.now() - new Date(metadato.ultimaModificacionLocal).getTime()) / (1000 * 60 * 60);
      setAlertaDatosAntiguos(horas > UMBRAL_ALERTA_HORAS);
    } else {
      setAlertaDatosAntiguos(false);
    }
    return total;
  }, [inspeccionId]);

  const forzarSincronizacion = useCallback(async (capturaOffline = false) => {
    if (sincronizandoRef.current) return;
    sincronizandoRef.current = true;
    setSincronizando(true);
    try {
      const resultado = await procesarColaSincronizacion(inspeccionId, clienteSincronizacion, { capturaOffline });
      const restantes = await refrescarPendientes();
      const exito = resultado.exitoTotal && restantes === 0;
      setHuboFalla(!exito);
      if (exito) {
        setConfirmacionVisible(true);
        setTimeout(() => setConfirmacionVisible(false), VENTANA_CONFIRMACION_MS);
      }
    } catch {
      setHuboFalla(true);
    } finally {
      setSincronizando(false);
      sincronizandoRef.current = false;
    }
  }, [inspeccionId, refrescarPendientes]);

  // Al montar: si ya hay pendientes de una sesión anterior (ej. recarga de página) y hay
  // conexión, reintenta de una vez en vez de esperar a la próxima respuesta o reconexión.
  useEffect(() => {
    refrescarPendientes().then((total) => {
      if (total > 0 && estadoConexion === "online") forzarSincronizacion();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspeccionId]);

  // Al reconectar (offline → online), sincroniza automáticamente.
  useEffect(() => {
    const eraOffline = estadoConexionAnteriorRef.current === "offline";
    estadoConexionAnteriorRef.current = estadoConexion;
    if (estadoConexion === "online" && eraOffline) {
      forzarSincronizacion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoConexion]);

  /** Estado derivado — nunca se guarda en un `useState` propio para evitar transiciones inconsistentes. */
  const estadoSincronizacion: EstadoSincronizacion = useMemo(() => {
    if (estadoConexion === "offline") return "DESCONECTADO";
    if (sincronizando) return "SINCRONIZANDO";
    if (confirmacionVisible) return "SINCRONIZADO";
    if (pendientes > 0 || huboFalla) return "ERROR_PARCIAL";
    return null;
  }, [estadoConexion, sincronizando, confirmacionVisible, pendientes, huboFalla]);

  /** Guarda un lote de respuestas (ej. todas las de una sección) en una sola escritura local. */
  const guardarRespuestasLote = useCallback(async (lote: DatosRespuestaOffline[]) => {
    for (const datos of lote) await guardarRespuestaLocal(datos);
    await marcarModificacionLocal(inspeccionId);
    await refrescarPendientes();
    if (estadoConexion === "online") {
      forzarSincronizacion();
    }
  }, [inspeccionId, estadoConexion, forzarSincronizacion, refrescarPendientes]);

  const guardarEvidencia = useCallback(async (nodoId: string, archivo: File) => {
    await guardarEvidenciaLocal(inspeccionId, nodoId, archivo);
    await marcarModificacionLocal(inspeccionId);
    await refrescarPendientes();
    if (estadoConexion === "online") {
      forzarSincronizacion();
    }
  }, [inspeccionId, estadoConexion, forzarSincronizacion, refrescarPendientes]);

  return {
    estadoConexion,
    estadoSincronizacion,
    pendientes,
    alertaDatosAntiguos,
    guardarRespuestasLote,
    guardarEvidencia,
    forzarSincronizacion,
  };
}
