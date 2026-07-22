"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { NodoArbol } from "@doonflow/shared";
import { idsPreguntasDelArbol } from "./utilidades-arbol";

interface DetalleConNodo {
  nodoId: string;
}

interface PropsWizardCertificacion {
  certificacionId: string;
  secciones: NodoArbol[];
  detalles: DetalleConNodo[];
  guardarSeccion: (seccionId: string) => Promise<void>;
  /** Id de la sección donde arrancar en vez de recalcularlo (usado por "Volver a una sección" desde la revisión). */
  seccionInicialId?: string;
}

/**
 * Navegación entre pasos del wizard (T-240): `pasoActual` 1..N (una sección de nivel 0
 * por paso). No persiste estado en BD — al recargar se recalcula a partir de qué
 * secciones ya tienen alguna respuesta guardada en `detalles`.
 */
export function usarWizardCertificacion({
  certificacionId,
  secciones,
  detalles,
  guardarSeccion,
  seccionInicialId,
}: PropsWizardCertificacion) {
  const router = useRouter();
  const totalPasos = secciones.length;

  const idsRespondidos = useMemo(() => new Set(detalles.map((d) => d.nodoId)), [detalles]);

  const seccionTieneRespuesta = useMemo(() => secciones.map(
    (s) => idsPreguntasDelArbol(s).some((id) => idsRespondidos.has(id)),
  ), [secciones, idsRespondidos]);

  const [pasoActual, setPasoActual] = useState(() => {
    if (seccionInicialId) {
      const idx = secciones.findIndex((s) => s.id === seccionInicialId);
      if (idx !== -1) return idx + 1;
    }
    const idx = seccionTieneRespuesta.findIndex((tiene) => !tiene);
    return idx === -1 ? Math.max(totalPasos, 1) : idx + 1;
  });

  const [pasosVisitados, setPasosVisitados] = useState<Set<number>>(() => {
    const set = new Set<number>();
    seccionTieneRespuesta.forEach((tiene, i) => { if (tiene) set.add(i + 1); });
    return set;
  });

  const [guardando, setGuardando] = useState(false);

  const seccionActual = secciones[pasoActual - 1];
  const esUltimoPaso = pasoActual === totalPasos;

  async function avanzar() {
    if (!seccionActual) return;
    setGuardando(true);
    try {
      await guardarSeccion(seccionActual.id);
      setPasosVisitados((prev) => new Set(prev).add(pasoActual));
      if (esUltimoPaso) {
        router.push(`/certificaciones/${certificacionId}/revision`);
      } else {
        setPasoActual((p) => p + 1);
      }
    } finally {
      setGuardando(false);
    }
  }

  function retroceder() {
    setPasoActual((p) => Math.max(1, p - 1));
  }

  function irAPaso(n: number) {
    const maxVisitado = pasosVisitados.size ? Math.max(...pasosVisitados) : 0;
    const permitido = pasosVisitados.has(n) || n === maxVisitado + 1;
    if (permitido) setPasoActual(n);
  }

  return {
    totalPasos,
    pasoActual,
    seccionActual,
    esUltimoPaso,
    pasosVisitados,
    guardando,
    avanzar,
    retroceder,
    irAPaso,
  };
}
