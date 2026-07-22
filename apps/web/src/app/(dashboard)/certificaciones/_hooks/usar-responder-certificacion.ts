"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { obtenerCertificacion } from "../_servicios/certificacion.servicio";
import type { CertificacionCompleta, DetalleCertificacion } from "../_servicios/certificacion.servicio";
import { idsPreguntasDelArbol } from "./utilidades-arbol";

export interface RespuestaLocal {
  valor?: string;
  valores?: string[];
  comentario?: string;
}

/** Subconjunto de `usar-captura-offline.ts` que este hook necesita — inyectado por quien lo llama (composición explícita, ver 012-captura-offline-campo). */
export interface CapturaOfflineInyectada {
  guardarRespuestasLote(lote: { inspeccionId: string; nodoId: string; valor?: string; valores?: string[]; comentario?: string }[]): Promise<void>;
  guardarEvidencia(nodoId: string, archivo: File): Promise<void>;
}

/**
 * Hook de datos del wizard: carga la certificación, guarda respuestas por sección, sube evidencias (T-230).
 * Desde 012-captura-offline-campo, todo guardado pasa primero por `capturaOffline` (escritura
 * local inmediata en IndexedDB) — nunca llama a la API directamente ni depende de que la
 * llamada HTTP tenga éxito de inmediato (el formulario no se bloquea sin conexión).
 */
export function usarResponderCertificacion(certificacionId: string, capturaOffline: CapturaOfflineInyectada) {
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
        mapa[d.nodoId] = { valor: d.valor ?? undefined, valores: d.valores, comentario: d.comentario ?? undefined };
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

  const actualizarValor = useCallback((nodoId: string, valor: string) => {
    setRespuestas((prev) => ({ ...prev, [nodoId]: { ...prev[nodoId], valor } }));
  }, []);

  const actualizarValores = useCallback((nodoId: string, valores: string[]) => {
    setRespuestas((prev) => ({ ...prev, [nodoId]: { ...prev[nodoId], valores } }));
  }, []);

  const actualizarComentario = useCallback((nodoId: string, comentario: string) => {
    setRespuestas((prev) => ({ ...prev, [nodoId]: { ...prev[nodoId], comentario } }));
  }, []);

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
            comentario: r.comentario ?? null,
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
    actualizarComentario,
    guardarSeccion,
    subirEvidencia,
    progresoPorSeccion,
    progresoGlobal,
    recargar: cargar,
  };
}
