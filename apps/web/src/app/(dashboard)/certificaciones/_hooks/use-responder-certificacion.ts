"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { obtenerCertificacion } from "../_servicios/certificacion.servicio";
import type { CertificacionCompleta, DetalleCertificacion } from "../_servicios/certificacion.servicio";
import { idsPreguntasDelArbol } from "./utilidades-arbol";

export interface RespuestaLocal {
  valor?: string;
  valores?: string[];
  /** Siempre visibles en el wizard (ambas respuestas Sí/No) — 2026-07-25. */
  comentarioReconocimiento?: string;
  comentarioObservacion?: string;
  comentarioOportunidadMejora?: string;
}

/** Subconjunto de `use-captura-offline.ts` que este hook necesita — inyectado por quien lo llama (composición explícita, ver 012-captura-offline-campo). */
export interface CapturaOfflineInyectada {
  guardarRespuestasLote(lote: {
    inspeccionId: string; nodoId: string; valor?: string; valores?: string[];
    comentarioReconocimiento?: string; comentarioObservacion?: string; comentarioOportunidadMejora?: string;
  }[]): Promise<void>;
  guardarEvidencia(nodoId: string, archivo: File): Promise<void>;
}

/**
 * Hook de datos del wizard: carga la certificación, guarda respuestas por sección, sube evidencias (T-230).
 * Desde 012-captura-offline-campo, todo guardado pasa primero por `capturaOffline` (escritura
 * local inmediata en IndexedDB) — nunca llama a la API directamente ni depende de que la
 * llamada HTTP tenga éxito de inmediato (el formulario no se bloquea sin conexión).
 */
export function useResponderCertificacion(certificacionId: string, capturaOffline: CapturaOfflineInyectada) {
  const [certificacion, setCertificacion] = useState<CertificacionCompleta | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, RespuestaLocal>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardandoSeccionId, setGuardandoSeccionId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerCertificacion(certificacionId);
      setCertificacion(data);
      const mapa: Record<string, RespuestaLocal> = {};
      data.detalles.forEach((d) => {
        mapa[d.nodoId] = {
          valor: d.valor ?? undefined,
          valores: d.valores,
          comentarioReconocimiento: d.comentarioReconocimiento ?? undefined,
          comentarioObservacion: d.comentarioObservacion ?? undefined,
          comentarioOportunidadMejora: d.comentarioOportunidadMejora ?? undefined,
        };
      });
      setRespuestas(mapa);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la certificación.");
    } finally {
      setCargando(false);
    }
  }, [certificacionId]);

  useEffect(() => { cargar(); }, [cargar]);

  const secciones = certificacion?.plantilla.nodos ?? [];

  /**
   * Autoguardado por pregunta (no esperar a "Siguiente"): cada cambio programa un guardado
   * local con un debounce corto por nodo — evita una escritura/sync por cada tecla en campos
   * de texto/número, pero nunca deja una respuesta marcada sin persistir si el usuario cierra
   * la pestaña o navega fuera antes de terminar la sección. `guardarSeccion()` (al pulsar
   * "Siguiente") sigue existiendo como respaldo idempotente — si el debounce ya guardó, solo
   * reenvía los mismos datos.
   */
  const timersAutoguardadoRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const programarAutoguardado = useCallback((nodoId: string, datos: RespuestaLocal) => {
    const timers = timersAutoguardadoRef.current;
    const anterior = timers.get(nodoId);
    if (anterior) clearTimeout(anterior);
    timers.set(nodoId, setTimeout(() => {
      timers.delete(nodoId);
      capturaOffline.guardarRespuestasLote([{ inspeccionId: certificacionId, nodoId, ...datos }]);
    }, 500));
  }, [capturaOffline, certificacionId]);

  useEffect(() => () => {
    timersAutoguardadoRef.current.forEach((t) => clearTimeout(t));
  }, []);

  const actualizarValor = useCallback((nodoId: string, valor: string) => {
    setRespuestas((prev) => {
      const actualizado = { ...prev[nodoId], valor };
      programarAutoguardado(nodoId, actualizado);
      return { ...prev, [nodoId]: actualizado };
    });
  }, [programarAutoguardado]);

  const actualizarValores = useCallback((nodoId: string, valores: string[]) => {
    setRespuestas((prev) => {
      const actualizado = { ...prev[nodoId], valores };
      programarAutoguardado(nodoId, actualizado);
      return { ...prev, [nodoId]: actualizado };
    });
  }, [programarAutoguardado]);

  const actualizarComentarioReconocimiento = useCallback((nodoId: string, comentarioReconocimiento: string) => {
    setRespuestas((prev) => {
      const actualizado = { ...prev[nodoId], comentarioReconocimiento };
      programarAutoguardado(nodoId, actualizado);
      return { ...prev, [nodoId]: actualizado };
    });
  }, [programarAutoguardado]);

  const actualizarComentarioObservacion = useCallback((nodoId: string, comentarioObservacion: string) => {
    setRespuestas((prev) => {
      const actualizado = { ...prev[nodoId], comentarioObservacion };
      programarAutoguardado(nodoId, actualizado);
      return { ...prev, [nodoId]: actualizado };
    });
  }, [programarAutoguardado]);

  const actualizarComentarioOportunidadMejora = useCallback((nodoId: string, comentarioOportunidadMejora: string) => {
    setRespuestas((prev) => {
      const actualizado = { ...prev[nodoId], comentarioOportunidadMejora };
      programarAutoguardado(nodoId, actualizado);
      return { ...prev, [nodoId]: actualizado };
    });
  }, [programarAutoguardado]);

  const guardarSeccion = useCallback(async (seccionId: string) => {
    const seccion = secciones.find((s) => s.id === seccionId);
    if (!seccion) return;
    const idsPregunta = idsPreguntasDelArbol(seccion);
    const payload = idsPregunta
      .filter((nodoId) => respuestas[nodoId])
      .map((nodoId) => ({ nodoId, ...respuestas[nodoId] }));

    if (payload.length === 0) return;

    setGuardandoSeccionId(seccionId);
    try {
      // Escritura local inmediata — nunca lanza, incluso sin conexión (queda en cola y se
      // sincroniza en segundo plano). El puntaje real se recalcula server-side al sincronizar.
      await capturaOffline.guardarRespuestasLote(payload.map((r) => ({ inspeccionId: certificacionId, ...r })));

      setCertificacion((prev) => {
        if (!prev) return prev;
        const otros = prev.detalles.filter((d) => !idsPregunta.includes(d.nodoId));
        const actualizados: DetalleCertificacion[] = payload.map((r) => {
          const existente = prev.detalles.find((d) => d.nodoId === r.nodoId);
          return {
            id: existente?.id ?? `offline:${r.nodoId}`,
            nodoId: r.nodoId,
            valor: r.valor ?? null,
            valores: r.valores ?? [],
            comentarioReconocimiento: r.comentarioReconocimiento ?? null,
            comentarioObservacion: r.comentarioObservacion ?? null,
            comentarioOportunidadMejora: r.comentarioOportunidadMejora ?? null,
            puntajeObtenido: existente?.puntajeObtenido ?? 0,
            puntajeMaximo: existente?.puntajeMaximo ?? 0,
          };
        });
        return { ...prev, detalles: [...otros, ...actualizados] };
      });
    } finally {
      setGuardandoSeccionId(null);
    }
  }, [certificacionId, secciones, respuestas, capturaOffline]);

  /** `nodoId` (no `detalleId`) — la evidencia puede capturarse antes de que exista un `InspeccionDetalle` real (ver seccion-wizard.tsx). */
  const subirEvidencia = useCallback(async (nodoId: string, archivo: File) => {
    await capturaOffline.guardarEvidencia(nodoId, archivo);
  }, [capturaOffline]);

  const progresoPorSeccion = useMemo(() => secciones.map((s) => {
    const ids = idsPreguntasDelArbol(s);
    const respondidas = ids.filter((id) => {
      const r = respuestas[id];
      return !!r && (r.valor !== undefined && r.valor !== "" || (r.valores?.length ?? 0) > 0);
    }).length;
    return { seccionId: s.id, titulo: s.titulo, respondidas, total: ids.length };
  }), [secciones, respuestas]);

  const progresoGlobal = useMemo(() => {
    if (progresoPorSeccion.length === 0) return 0;
    const completas = progresoPorSeccion.filter((p) => p.total > 0 && p.respondidas === p.total).length;
    return Math.round((completas / progresoPorSeccion.length) * 100);
  }, [progresoPorSeccion]);

  return {
    certificacion,
    secciones,
    respuestas,
    cargando,
    error,
    guardandoSeccionId,
    actualizarValor,
    actualizarValores,
    actualizarComentarioReconocimiento,
    actualizarComentarioObservacion,
    actualizarComentarioOportunidadMejora,
    guardarSeccion,
    subirEvidencia,
    progresoPorSeccion,
    progresoGlobal,
    recargar: cargar,
  };
}
