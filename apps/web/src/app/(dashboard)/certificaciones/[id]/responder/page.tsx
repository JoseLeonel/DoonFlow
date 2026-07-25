"use client";

import { useParams, useSearchParams } from "next/navigation";
import type { NodoArbol } from "@doonflow/shared";
import { useResponderCertificacion } from "../../_hooks/use-responder-certificacion";
import type { RespuestaLocal } from "../../_hooks/use-responder-certificacion";
import { useCapturaOffline } from "../../_hooks/use-captura-offline";
import { useWizardCertificacion } from "../../_hooks/use-wizard-certificacion";
import { WizardCertificacion } from "../../_components/wizard-certificacion";
import { SeccionWizard } from "../../_components/seccion-wizard";
import { BannerEstadoConexion } from "../../_components/banner-estado-conexion";
import { StripResumenCertificacion } from "../../_components/strip-resumen-certificacion";
import { calcularPuntajeRespuestaLocal, preguntasDelArbol } from "../../_hooks/utilidades-arbol";
import { formatearPeriodoCertificacion } from "../../_hooks/formato-periodo";
import type { CertificacionCompleta } from "../../_servicios/certificacion.servicio";

export default function PaginaResponderCertificacion() {
  const { id } = useParams<{ id: string }>();
  const capturaOffline = useCapturaOffline(id);
  const {
    certificacion, secciones, respuestas, cargando, error,
    guardandoSeccionId, actualizarValor, actualizarValores,
    actualizarComentarioReconocimiento, actualizarComentarioObservacion, actualizarComentarioOportunidadMejora,
    guardarSeccion, subirEvidencia, progresoPorSeccion,
  } = useResponderCertificacion(id, capturaOffline);

  if (cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-stroke border-t-primary" />
      </div>
    );
  }

  if (error || !certificacion) {
    return <p className="p-8 text-red">{error ?? "Certificación no encontrada."}</p>;
  }

  if (secciones.length === 0) {
    return <p className="p-8 text-dark-4 dark:text-dark-6">La plantilla vigente no tiene secciones configuradas.</p>;
  }

  const todasLasPreguntas = secciones.flatMap(preguntasDelArbol);
  const totalPreguntas = todasLasPreguntas.length;
  // En vivo desde `respuestas` (estado local, se actualiza con cada tecla/clic) — no desde
  // `certificacion.detalles`, que solo se refresca al guardar la sección completa (botón
  // "Siguiente"). Encontrado en pruebas manuales (2026-07-24): el puntaje del encabezado no
  // sumaba mientras se iba respondiendo.
  const puntajeObtenidoActual = todasLasPreguntas.reduce((acc, nodo) => {
    const r = respuestas[nodo.id];
    if (!r) return acc;
    return acc + calcularPuntajeRespuestaLocal(nodo, r.valor, r.valores);
  }, 0);

  return (
    <div className="p-6 md:p-7.5">
      <div className="mx-auto max-w-[900px]">
        <StripResumenCertificacion
          plantillaNombre={certificacion.plantilla.nombre}
          periodoTexto={formatearPeriodoCertificacion(certificacion)}
          estado={certificacion.estado}
          totalSecciones={secciones.length}
          totalPreguntas={totalPreguntas}
          puntajeObtenido={puntajeObtenidoActual}
          puntajeMaximo={certificacion.plantilla.puntajeMaximo}
        />
        <BannerEstadoConexion
          estado={capturaOffline.estadoSincronizacion}
          pendientes={capturaOffline.pendientes}
          alertaDatosAntiguos={capturaOffline.alertaDatosAntiguos}
        />
      </div>
      <WizardCertificacionConEstado
        certificacionId={id}
        certificacion={certificacion}
        secciones={secciones}
        respuestas={respuestas}
        guardandoSeccionId={guardandoSeccionId}
        actualizarValor={actualizarValor}
        actualizarValores={actualizarValores}
        actualizarComentarioReconocimiento={actualizarComentarioReconocimiento}
        actualizarComentarioObservacion={actualizarComentarioObservacion}
        actualizarComentarioOportunidadMejora={actualizarComentarioOportunidadMejora}
        guardarSeccion={guardarSeccion}
        subirEvidencia={subirEvidencia}
        progresoPorSeccion={progresoPorSeccion}
      />
    </div>
  );
}

/** Componente interno: se monta solo cuando `secciones` ya está disponible, para que el hook del wizard calcule el paso inicial con datos reales. */
function WizardCertificacionConEstado({
  certificacionId, certificacion, secciones, respuestas, guardandoSeccionId,
  actualizarValor, actualizarValores,
  actualizarComentarioReconocimiento, actualizarComentarioObservacion, actualizarComentarioOportunidadMejora,
  guardarSeccion, subirEvidencia, progresoPorSeccion,
}: {
  certificacionId: string;
  certificacion: CertificacionCompleta;
  secciones: NodoArbol[];
  respuestas: Record<string, RespuestaLocal>;
  guardandoSeccionId: string | null;
  actualizarValor: (nodoId: string, valor: string) => void;
  actualizarValores: (nodoId: string, valores: string[]) => void;
  actualizarComentarioReconocimiento: (nodoId: string, comentario: string) => void;
  actualizarComentarioObservacion: (nodoId: string, comentario: string) => void;
  actualizarComentarioOportunidadMejora: (nodoId: string, comentario: string) => void;
  guardarSeccion: (seccionId: string) => Promise<void>;
  subirEvidencia: (nodoId: string, archivo: File) => Promise<unknown>;
  progresoPorSeccion: { seccionId: string; respondidas: number; total: number }[];
}) {
  const searchParams = useSearchParams();
  const seccionInicialId = searchParams.get("seccionId") ?? undefined;

  const { totalPasos, pasoActual, seccionActual, esUltimoPaso, pasosVisitados, guardando, avanzar, retroceder, irAPaso } =
    useWizardCertificacion({
      certificacionId,
      secciones,
      detalles: certificacion.detalles,
      guardarSeccion,
      seccionInicialId,
    });

  if (!seccionActual) return null;

  return (
    <WizardCertificacion
      totalPasos={totalPasos}
      pasoActual={pasoActual}
      pasosVisitados={pasosVisitados}
      esUltimoPaso={esUltimoPaso}
      guardando={guardando || guardandoSeccionId === seccionActual.id}
      titulosSecciones={secciones.map((s) => s.titulo)}
      seccionesCompletas={progresoPorSeccion.map((p) => p.total > 0 && p.respondidas === p.total)}
      onAnterior={retroceder}
      onSiguiente={avanzar}
      onIrAPaso={irAPaso}
    >
      <SeccionWizard
        seccion={seccionActual}
        respuestas={respuestas}
        detalles={certificacion.detalles}
        evidencias={certificacion.evidencias}
        onChangeValor={actualizarValor}
        onChangeValores={actualizarValores}
        onChangeComentarioReconocimiento={actualizarComentarioReconocimiento}
        onChangeComentarioObservacion={actualizarComentarioObservacion}
        onChangeComentarioOportunidadMejora={actualizarComentarioOportunidadMejora}
        onSubirEvidencia={subirEvidencia}
      />
    </WizardCertificacion>
  );
}
