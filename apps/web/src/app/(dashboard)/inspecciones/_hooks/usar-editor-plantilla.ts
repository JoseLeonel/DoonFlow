"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sumarPuntajes, contarPreguntas } from "@doonflow/shared";
import type { PlantillaCompleta, NodoArbol, RangoResultado } from "@doonflow/shared";
import {
  obtenerPlantillaCompleta,
  crearNodo,
  actualizarNodo,
  eliminarNodo,
  reordenarNodos,
  guardarRangos,
  toggleEstadoPlantilla,
  enviarRevisionPlantilla,
  type DatosCrearNodo,
} from "../_servicios/inspeccion.servicio";

export type ModoEditor = "vista" | "edicion";

export interface EstadoEditorPlantilla {
  plantilla: PlantillaCompleta | null;
  cargando: boolean;
  error: string | null;
  modo: ModoEditor;
  nodoActivo: NodoArbol | null;
  panelAbierto: boolean;
  formPanelDirty: boolean;
  guardandoNodo: boolean;
  errorPanel: string | null;
  seccionesColapsadas: Set<string>;
  /** Mostrar el diálogo de guardia de navegación. */
  mostrarDialogoSalida: boolean;
  /** Ruta destino pendiente (cuando la guardia la intercepta). */
  rutaPendiente: string | null;
  // Derivados
  hayCambiosPendientes: boolean;
  puntajeAcumulado: number;
  totalPreguntas: number;
}

interface AccionesEditorPlantilla {
  /** Alterna entre modo vista y modo edición. */
  toggleModo: () => void;
  /** Expande todos los nodos PANEL. */
  expandirTodo: () => void;
  /** Colapsa todos los nodos PANEL. */
  contraerTodo: () => void;
  /** Actualiza el puntaje de un ítem directamente (stepper inline). */
  actualizarPuntaje: (nodoId: string, puntaje: number) => Promise<void>;
  /** Abre el panel lateral con el nodo dado. */
  abrirPanel: (nodo: NodoArbol) => void;
  /**
   * Cierra el panel lateral.
   * Si hay cambios sin guardar, expone `mostrarDialogoSalida = true` en lugar de cerrar.
   * @param forzar - Si `true`, cierra sin verificar cambios pendientes.
   */
  cerrarPanel: (forzar?: boolean) => void;
  /** Marca el formulario del panel como modificado. */
  marcarPanelDirty: () => void;
  /** Guarda un nodo (crear o actualizar) y actualiza el árbol local. */
  guardarNodo: (datos: DatosCrearNodo & { id?: string }) => Promise<void>;
  /** Crea un nodo nuevo y abre el panel para editarlo. */
  crearNuevoNodo: (tipo: "PANEL" | "PREGUNTA", padreId?: string) => Promise<void>;
  /** Elimina un nodo y actualiza el árbol local. */
  borrarNodo: (nodoId: string) => Promise<void>;
  /** Reordena nodos hermanos intercambiando el nodo con el anterior o siguiente. */
  moverNodo: (nodoId: string, direccion: "arriba" | "abajo") => Promise<void>;
  /** Expande o colapsa una sección de nivel 0. */
  toggleColapso: (nodoId: string) => void;
  /** Guarda los rangos de resultado y actualiza el estado local. */
  guardarRangosPlantilla: (rangos: Omit<RangoResultado, "id">[]) => Promise<void>;
  /** Activa o desactiva la plantilla. */
  toggleEstado: () => Promise<void>;
  /** Envía la plantilla a revisión (007-gobernanza-permisos-aprobacion). */
  enviarRevision: () => Promise<void>;
  /** Intenta navegar a una ruta; si hay cambios pendientes, muestra el diálogo de guardia. */
  navegarCon: (ruta: string) => void;
  /** Confirma la salida pendiente (botón "Salir sin guardar"). */
  confirmarSalida: () => void;
  /** Cancela el diálogo de salida (botón "Quedarse"). */
  cancelarSalida: () => void;
  /** Recarga la plantilla completa desde el servidor. */
  recargar: () => Promise<void>;
}

/**
 * Hook central del editor de Ficha de Inspección.
 * Centraliza todo el estado del editor; los componentes no llaman servicios directamente.
 *
 * @param plantillaId - ID de la plantilla a editar.
 */
export function usarEditorPlantilla(
  plantillaId: string,
): EstadoEditorPlantilla & AccionesEditorPlantilla {
  const router = useRouter();
  const [plantilla, setPlantilla] = useState<PlantillaCompleta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<ModoEditor>("vista");
  const [nodoActivo, setNodoActivo] = useState<NodoArbol | null>(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [formPanelDirty, setFormPanelDirty] = useState(false);
  const [guardandoNodo, setGuardandoNodo] = useState(false);
  const [errorPanel, setErrorPanel] = useState<string | null>(null);
  const [seccionesColapsadas, setSeccionesColapsadas] = useState<Set<string>>(new Set());
  const [mostrarDialogoSalida, setMostrarDialogoSalida] = useState(false);
  const [rutaPendiente, setRutaPendiente] = useState<string | null>(null);

  // Ref al botón que abrió el panel (para restaurar foco al cerrar)
  const refBotonApertura = useRef<HTMLElement | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerPlantillaCompleta(plantillaId);
      setPlantilla(data);
      // Colapsar todas las secciones de nivel 0 al cargar
      const raices = data.nodos
        .filter((n) => n.nivel === 0 && n.tipo === "PANEL")
        .map((n) => n.id);
      setSeccionesColapsadas(new Set(raices));
    } catch {
      setError("No se pudo cargar la ficha de inspección.");
    } finally {
      setCargando(false);
    }
  }, [plantillaId]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Derivados ──────────────────────────────────────────────────────────────

  const hayCambiosPendientes = panelAbierto && formPanelDirty;

  const puntajeAcumulado = useMemo(
    () => sumarPuntajes(plantilla?.nodos ?? []),
    [plantilla?.nodos],
  );

  const totalPreguntas = useMemo(
    () => contarPreguntas(plantilla?.nodos ?? []),
    [plantilla?.nodos],
  );

  // ── Acciones ───────────────────────────────────────────────────────────────

  const toggleModo = () => setModo((m) => (m === "vista" ? "edicion" : "vista"));

  const abrirPanel = (nodo: NodoArbol) => {
    setNodoActivo(nodo);
    setPanelAbierto(true);
    setFormPanelDirty(false);
    setErrorPanel(null);
  };

  const cerrarPanel = (forzar = false) => {
    if (!forzar && hayCambiosPendientes) {
      setMostrarDialogoSalida(true);
      return;
    }
    setPanelAbierto(false);
    setNodoActivo(null);
    setFormPanelDirty(false);
    setErrorPanel(null);
    // Restaurar foco al elemento que abrió el panel
    refBotonApertura.current?.focus();
    refBotonApertura.current = null;
  };

  const marcarPanelDirty = () => setFormPanelDirty(true);

  const guardarNodo = async (datos: DatosCrearNodo & { id?: string }) => {
    if (!plantilla) return;
    setGuardandoNodo(true);
    setErrorPanel(null);
    try {
      let nodoActualizado: NodoArbol;
      if (datos.id) {
        nodoActualizado = await actualizarNodo(plantillaId, datos.id, datos);
      } else {
        nodoActualizado = await crearNodo(plantillaId, datos);
      }
      // Actualizar el árbol local
      const actualizarEnArbol = (nodos: NodoArbol[]): NodoArbol[] =>
        nodos.map((n) => {
          if (n.id === nodoActualizado.id) return { ...nodoActualizado, hijos: n.hijos };
          return { ...n, hijos: actualizarEnArbol(n.hijos) };
        });

      setPlantilla((prev) => {
        if (!prev) return prev;
        const existeEnArbol = prev.nodos.some((n) => n.id === nodoActualizado.id);
        if (existeEnArbol || datos.id) {
          return { ...prev, nodos: actualizarEnArbol(prev.nodos) };
        }
        // Nodo nuevo: agregar como hijo del padre o en raíz
        if (datos.padreId) {
          const agregarHijo = (nodos: NodoArbol[]): NodoArbol[] =>
            nodos.map((n) => {
              if (n.id === datos.padreId) return { ...n, hijos: [...n.hijos, nodoActualizado] };
              return { ...n, hijos: agregarHijo(n.hijos) };
            });
          return { ...prev, nodos: agregarHijo(prev.nodos) };
        }
        return { ...prev, nodos: [...prev.nodos, nodoActualizado] };
      });

      setFormPanelDirty(false);
      setPanelAbierto(false);
      setNodoActivo(null);
    } catch (e: unknown) {
      setErrorPanel(e instanceof Error ? e.message : "Error al guardar el nodo.");
    } finally {
      setGuardandoNodo(false);
    }
  };

  const crearNuevoNodo = async (tipo: "PANEL" | "PREGUNTA", padreId?: string) => {
    if (!plantilla) return;
    // Calcular orden: cantidad de hermanos actuales
    const obtenerHermanos = (nodos: NodoArbol[], pid?: string): NodoArbol[] => {
      if (!pid) return nodos.filter((n) => !n.padreId);
      for (const n of nodos) {
        if (n.id === pid) return n.hijos;
        const sub = obtenerHermanos(n.hijos, pid);
        if (sub.length > 0) return sub;
      }
      return [];
    };
    const hermanos = obtenerHermanos(plantilla.nodos, padreId);
    const orden = hermanos.length;

    // Número provisional para el código
    const codigoProvisional = padreId
      ? `${hermanos.length + 1}`
      : String(plantilla.nodos.filter((n) => n.nivel === 0).length + 1);

    const nodo = await crearNodo(plantillaId, {
      tipo,
      padreId,
      codigo: codigoProvisional,
      titulo: tipo === "PANEL" ? "Nueva sección" : "Nueva pregunta",
      orden,
    });

    setPlantilla((prev) => {
      if (!prev) return prev;
      if (padreId) {
        const agregarHijo = (nodos: NodoArbol[]): NodoArbol[] =>
          nodos.map((n) => {
            if (n.id === padreId) return { ...n, hijos: [...n.hijos, nodo] };
            return { ...n, hijos: agregarHijo(n.hijos) };
          });
        return { ...prev, nodos: agregarHijo(prev.nodos) };
      }
      return { ...prev, nodos: [...prev.nodos, nodo] };
    });

    abrirPanel(nodo);
  };

  const borrarNodo = async (nodoId: string) => {
    await eliminarNodo(plantillaId, nodoId);
    const eliminarDelArbol = (nodos: NodoArbol[]): NodoArbol[] =>
      nodos.filter((n) => n.id !== nodoId).map((n) => ({ ...n, hijos: eliminarDelArbol(n.hijos) }));
    setPlantilla((prev) => prev ? { ...prev, nodos: eliminarDelArbol(prev.nodos) } : prev);
  };

  const moverNodo = async (nodoId: string, direccion: "arriba" | "abajo") => {
    if (!plantilla) return;
    // Encontrar los hermanos del nodo
    const encontrarHermanos = (nodos: NodoArbol[]): NodoArbol[] | null => {
      for (const n of nodos) {
        if (n.hijos.some((h) => h.id === nodoId)) return n.hijos;
        const sub = encontrarHermanos(n.hijos);
        if (sub) return sub;
      }
      return null;
    };
    const hermanos = encontrarHermanos(plantilla.nodos) ??
      (plantilla.nodos.some((n) => n.id === nodoId) ? plantilla.nodos : null);
    if (!hermanos) return;

    const idx = hermanos.findIndex((n) => n.id === nodoId);
    const otroIdx = direccion === "arriba" ? idx - 1 : idx + 1;
    if (otroIdx < 0 || otroIdx >= hermanos.length) return;

    const items = hermanos.map((n, i) => {
      if (i === idx) return { id: n.id, orden: hermanos[otroIdx]!.orden };
      if (i === otroIdx) return { id: n.id, orden: hermanos[idx]!.orden };
      return { id: n.id, orden: n.orden };
    });

    await reordenarNodos(plantillaId, items);
    await cargar();
  };

  const toggleColapso = (nodoId: string) => {
    setSeccionesColapsadas((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(nodoId)) siguiente.delete(nodoId);
      else siguiente.add(nodoId);
      return siguiente;
    });
  };

  const expandirTodo = () => setSeccionesColapsadas(new Set());

  const contraerTodo = () => {
    if (!plantilla) return;
    const obtenerIdsPaneles = (nodos: NodoArbol[]): string[] =>
      nodos.flatMap((n) =>
        n.tipo === "PANEL" ? [n.id, ...obtenerIdsPaneles(n.hijos)] : obtenerIdsPaneles(n.hijos),
      );
    setSeccionesColapsadas(new Set(obtenerIdsPaneles(plantilla.nodos)));
  };

  const actualizarPuntaje = async (nodoId: string, puntaje: number) => {
    const actualizarArbol = (nodos: NodoArbol[]): NodoArbol[] =>
      nodos.map((n) =>
        n.id === nodoId
          ? { ...n, puntajeMaximo: puntaje }
          : { ...n, hijos: actualizarArbol(n.hijos) },
      );
    setPlantilla((prev) => prev ? { ...prev, nodos: actualizarArbol(prev.nodos) } : prev);
    try {
      await actualizarNodo(plantillaId, nodoId, { puntajeMaximo: puntaje });
    } catch {
      await cargar();
    }
  };

  const guardarRangosPlantilla = async (rangos: Omit<RangoResultado, "id">[]) => {
    const guardados = await guardarRangos(plantillaId, rangos);
    setPlantilla((prev) => prev ? { ...prev, rangosResultado: guardados } : prev);
  };

  const toggleEstado = async () => {
    if (!plantilla) return;
    const actualizada = await toggleEstadoPlantilla(plantillaId, !plantilla.activa);
    setPlantilla((prev) => prev ? { ...prev, activa: actualizada.activa } : prev);
  };

  const enviarRevision = async () => {
    const actualizada = await enviarRevisionPlantilla(plantillaId);
    setPlantilla((prev) => (prev ? { ...prev, ...actualizada } : prev));
  };

  const navegarCon = (ruta: string) => {
    if (hayCambiosPendientes) {
      setRutaPendiente(ruta);
      setMostrarDialogoSalida(true);
      return;
    }
    router.push(ruta);
  };

  const confirmarSalida = () => {
    setMostrarDialogoSalida(false);
    setPanelAbierto(false);
    setFormPanelDirty(false);
    if (rutaPendiente) {
      router.push(rutaPendiente);
      setRutaPendiente(null);
    }
  };

  const cancelarSalida = () => {
    setMostrarDialogoSalida(false);
    setRutaPendiente(null);
  };

  return {
    plantilla, cargando, error, modo, nodoActivo, panelAbierto,
    formPanelDirty, guardandoNodo, errorPanel, seccionesColapsadas,
    mostrarDialogoSalida, rutaPendiente,
    hayCambiosPendientes, puntajeAcumulado, totalPreguntas,
    toggleModo, abrirPanel, cerrarPanel, marcarPanelDirty,
    guardarNodo, crearNuevoNodo, borrarNodo, moverNodo,
    toggleColapso, expandirTodo, contraerTodo, actualizarPuntaje,
    guardarRangosPlantilla, toggleEstado, enviarRevision,
    navegarCon, confirmarSalida, cancelarSalida, recargar: cargar,
  };
}
