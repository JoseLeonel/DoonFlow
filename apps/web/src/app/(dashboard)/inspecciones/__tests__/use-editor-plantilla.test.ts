import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEditorPlantilla } from "../_hooks/use-editor-plantilla";
import type { PlantillaCompleta, NodoArbol } from "@doonflow/shared";

// ── Mocks de servicios ─────────────────────────────────────────────────────────

vi.mock("../_servicios/inspeccion.servicio", () => ({
  obtenerPlantillaCompleta: vi.fn(),
  crearNodo: vi.fn(),
  actualizarNodo: vi.fn(),
  eliminarNodo: vi.fn(),
  reordenarNodos: vi.fn(),
  guardarRangos: vi.fn(),
  toggleEstadoPlantilla: vi.fn(),
  enviarRevisionPlantilla: vi.fn(),
}));

import * as servicio from "../_servicios/inspeccion.servicio";

// ── Fábricas ────────────────────────────────────────────────────────────────────

function nodoPanel(parcial: Partial<NodoArbol> = {}): NodoArbol {
  return {
    id: "s1",
    padreId: null,
    tipo: "PANEL",
    codigo: "S1",
    titulo: "Sección 1",
    orden: 0,
    nivel: 0,
    activo: true,
    puntajeMaximo: 0,
    evidenciaObligatoria: false,
    evidenciaMinima: 0,
    evidenciaMaxima: 0,
    opciones: [],
    hijos: [],
    ...parcial,
  };
}

function nodoPregunta(parcial: Partial<NodoArbol> = {}): NodoArbol {
  return {
    id: "p1",
    padreId: "s1",
    tipo: "PREGUNTA",
    codigo: "P1",
    titulo: "Pregunta 1",
    orden: 0,
    nivel: 1,
    activo: true,
    tipoRespuesta: "SI_NO",
    modalidadPuntaje: "FIJO",
    puntajeMaximo: 50,
    evidenciaObligatoria: false,
    evidenciaMinima: 0,
    evidenciaMaxima: 5,
    opciones: [],
    hijos: [],
    ...parcial,
  };
}

function plantillaCompleta(nodos: NodoArbol[] = []): PlantillaCompleta {
  return {
    id: "p1",
    empresaId: "e1",
    nombre: "Ficha de Calidad",
    tipo: "CALIDAD",
    activa: true,
    puntajeMaximo: 100,
    version: 1,
    creadoEn: new Date("2026-01-01"),
    actualizadoEn: new Date("2026-01-01"),
    estadoAprobacion: "BORRADOR",
    nodos,
    rangosResultado: [],
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("useEditorPlantilla", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inicia en estado de carga", () => {
    vi.mocked(servicio.obtenerPlantillaCompleta).mockResolvedValue(plantillaCompleta());

    const { result } = renderHook(() => useEditorPlantilla("p1"));

    expect(result.current.cargando).toBe(true);
    expect(result.current.plantilla).toBeNull();
  });

  it("carga la plantilla y queda con cargando=false", async () => {
    const p = plantillaCompleta();
    vi.mocked(servicio.obtenerPlantillaCompleta).mockResolvedValue(p);

    const { result } = renderHook(() => useEditorPlantilla("p1"));

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(result.current.plantilla).toBeDefined();
    expect(result.current.plantilla?.nombre).toBe("Ficha de Calidad");
    expect(result.current.error).toBeNull();
  });

  it("establece error cuando el servicio falla", async () => {
    vi.mocked(servicio.obtenerPlantillaCompleta).mockRejectedValue(new Error("Red caída"));

    const { result } = renderHook(() => useEditorPlantilla("p1"));

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.plantilla).toBeNull();
  });

  it("colapsa las secciones de nivel 0 al cargar", async () => {
    const p = plantillaCompleta([nodoPanel({ id: "s1" }), nodoPanel({ id: "s2" })]);
    vi.mocked(servicio.obtenerPlantillaCompleta).mockResolvedValue(p);

    const { result } = renderHook(() => useEditorPlantilla("p1"));

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.seccionesColapsadas.has("s1")).toBe(true);
    expect(result.current.seccionesColapsadas.has("s2")).toBe(true);
  });

  it("calcula puntajeAcumulado y totalPreguntas desde los nodos", async () => {
    const nodo = nodoPanel({
      id: "s1",
      hijos: [nodoPregunta({ puntajeMaximo: 50 }), nodoPregunta({ id: "p2", puntajeMaximo: 50 })],
    });
    vi.mocked(servicio.obtenerPlantillaCompleta).mockResolvedValue(plantillaCompleta([nodo]));

    const { result } = renderHook(() => useEditorPlantilla("p1"));

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.puntajeAcumulado).toBe(100);
    expect(result.current.totalPreguntas).toBe(2);
  });

  it("toggleModo alterna entre vista y edicion", async () => {
    vi.mocked(servicio.obtenerPlantillaCompleta).mockResolvedValue(plantillaCompleta());
    const { result } = renderHook(() => useEditorPlantilla("p1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.modo).toBe("vista");

    act(() => result.current.toggleModo());
    expect(result.current.modo).toBe("edicion");

    act(() => result.current.toggleModo());
    expect(result.current.modo).toBe("vista");
  });

  it("abrirPanel establece nodoActivo y panelAbierto=true", async () => {
    vi.mocked(servicio.obtenerPlantillaCompleta).mockResolvedValue(plantillaCompleta());
    const { result } = renderHook(() => useEditorPlantilla("p1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    const nodo = nodoPanel();
    act(() => result.current.abrirPanel(nodo));

    expect(result.current.panelAbierto).toBe(true);
    expect(result.current.nodoActivo?.id).toBe("s1");
  });

  it("cerrarPanel sin cambios cierra el panel directamente", async () => {
    vi.mocked(servicio.obtenerPlantillaCompleta).mockResolvedValue(plantillaCompleta());
    const { result } = renderHook(() => useEditorPlantilla("p1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.abrirPanel(nodoPanel()));
    act(() => result.current.cerrarPanel());

    expect(result.current.panelAbierto).toBe(false);
    expect(result.current.nodoActivo).toBeNull();
  });

  it("cerrarPanel con cambios pendientes muestra el diálogo de salida", async () => {
    vi.mocked(servicio.obtenerPlantillaCompleta).mockResolvedValue(plantillaCompleta());
    const { result } = renderHook(() => useEditorPlantilla("p1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.abrirPanel(nodoPanel()));
    act(() => result.current.marcarPanelDirty());
    act(() => result.current.cerrarPanel());

    expect(result.current.mostrarDialogoSalida).toBe(true);
    expect(result.current.panelAbierto).toBe(true);
  });

  it("confirmarSalida cierra el panel y navega a la ruta pendiente", async () => {
    const mockPush = vi.fn();
    vi.mocked(servicio.obtenerPlantillaCompleta).mockResolvedValue(plantillaCompleta());

    // El mock de next/navigation ya proporciona useRouter con push: vi.fn()
    // Para este test verificamos el comportamiento de estado
    const { result } = renderHook(() => useEditorPlantilla("p1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.abrirPanel(nodoPanel()));
    act(() => result.current.marcarPanelDirty());
    act(() => result.current.navegarCon("/otra-ruta"));

    expect(result.current.mostrarDialogoSalida).toBe(true);
    expect(result.current.rutaPendiente).toBe("/otra-ruta");

    act(() => result.current.confirmarSalida());

    expect(result.current.mostrarDialogoSalida).toBe(false);
    expect(result.current.panelAbierto).toBe(false);
  });

  it("cancelarSalida cierra el diálogo y limpia la ruta pendiente", async () => {
    vi.mocked(servicio.obtenerPlantillaCompleta).mockResolvedValue(plantillaCompleta());
    const { result } = renderHook(() => useEditorPlantilla("p1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.abrirPanel(nodoPanel()));
    act(() => result.current.marcarPanelDirty());
    act(() => result.current.navegarCon("/otra-ruta"));
    act(() => result.current.cancelarSalida());

    expect(result.current.mostrarDialogoSalida).toBe(false);
    expect(result.current.rutaPendiente).toBeNull();
    expect(result.current.panelAbierto).toBe(true);
  });

  it("toggleColapso expande una sección colapsada", async () => {
    const p = plantillaCompleta([nodoPanel({ id: "s1" })]);
    vi.mocked(servicio.obtenerPlantillaCompleta).mockResolvedValue(p);
    const { result } = renderHook(() => useEditorPlantilla("p1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    // Al cargar, las secciones de nivel 0 quedan colapsadas
    expect(result.current.seccionesColapsadas.has("s1")).toBe(true);

    act(() => result.current.toggleColapso("s1"));

    expect(result.current.seccionesColapsadas.has("s1")).toBe(false);
  });

  it("enviarRevision actualiza estadoAprobacion localmente sin recargar (007)", async () => {
    const p = plantillaCompleta();
    vi.mocked(servicio.obtenerPlantillaCompleta).mockResolvedValue(p);
    vi.mocked(servicio.enviarRevisionPlantilla).mockResolvedValue({ ...p, estadoAprobacion: "EN_REVISION" });
    const { result } = renderHook(() => useEditorPlantilla("p1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => { await result.current.enviarRevision(); });

    expect(servicio.enviarRevisionPlantilla).toHaveBeenCalledWith("p1");
    expect(result.current.plantilla?.estadoAprobacion).toBe("EN_REVISION");
    expect(servicio.obtenerPlantillaCompleta).toHaveBeenCalledTimes(1);
  });
});
