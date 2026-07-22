"use client";

import { useParams, useSearchParams } from "next/navigation";
import type { NodoArbol } from "@doonflow/shared";
import { usarResponderCertificacion } from "../../_hooks/usar-responder-certificacion";
import type { RespuestaLocal } from "../../_hooks/usar-responder-certificacion";
import { usarCapturaOffline } from "../../_hooks/usar-captura-offline";
import { usarWizardCertificacion } from "../../_hooks/usar-wizard-certificacion";
import { WizardCertificacion } from "../../_components/wizard-certificacion";
import { SeccionWizard } from "../../_components/seccion-wizard";
import { BannerEstadoConexion } from "../../_components/banner-estado-conexion";
import type { CertificacionCompleta } from "../../_servicios/certificacion.servicio";

export default function PaginaResponderCertificacion() {
  const { id } = useParams<{ id: string }>();
  const capturaOffline = usarCapturaOffline(id);
  const {
    certificacion, secciones, respuestas, cargando, error,
    guardandoSeccionId, actualizarValor, actualizarValores, actualizarComentario,
    guardarSeccion, subirEvidencia, progresoPorSeccion,
  } = usarResponderCertificacion(id, capturaOffline);

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

  return (
    <div className="p-6 md:p-7.5">
      <div className="mx-auto max-w-[900px]">
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
        actualizarComentario={actualizarComentario}
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
  actualizarValor, actualizarValores, actualizarComentario, guardarSeccion, subirEvidencia, progresoPorSeccion,
}: {
  certificacionId: string;
  certificacion: CertificacionCompleta;
  secciones: NodoArbol[];
  respuestas: Record<string, RespuestaLocal>;
  guardandoSeccionId: string | null;
  actualizarValor: (nodoId: string, valor: string) => void;
  actualizarValores: (nodoId: string, valores: string[]) => void;
  actualizarComentario: (nodoId: string, comentario: string) => void;
  guardarSeccion: (seccionId: string) => Promise<void>;
  subirEvidencia: (nodoId: string, archivo: File) => Promise<unknown>;
  progresoPorSeccion: { seccionId: string; respondidas: number; total: number }[];
}) {
  const searchParams = useSearchParams();
  const seccionInicialId = searchParams.get("seccionId") ?? undefined;

  const { totalPasos, pasoActual, seccionActual, esUltimoPaso, pasosVisitados, guardando, avanzar, retroceder, irAPaso } =
    usarWizardCertificacion({
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
        onChangeComentario={actualizarComentario}
        onSubirEvidencia={subirEvidencia}
      />
    </WizardCertificacion>
  );
}
