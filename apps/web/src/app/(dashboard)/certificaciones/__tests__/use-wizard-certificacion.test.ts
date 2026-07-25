import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodoArbol } from "@doonflow/shared";
import { useWizardCertificacion } from "../_hooks/use-wizard-certificacion";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function seccion(id: string, titulo: string): NodoArbol {
  return {
    id, padreId: null, tipo: "PANEL", codigo: id, titulo, orden: 0, nivel: 0, activo: true,
    puntajeMaximo: 0, evidenciaObligatoria: false,
    evidenciaMinima: 0, evidenciaMaxima: 0, opciones: [],
    hijos: [{
      id: `${id}-p1`, padreId: id, tipo: "PREGUNTA", codigo: `${id}.1`, titulo: "P1", orden: 0, nivel: 1,
      activo: true, puntajeMaximo: 10, evidenciaObligatoria: false,
      evidenciaMinima: 0, evidenciaMaxima: 0, opciones: [], hijos: [],
    }],
  };
}

describe("useWizardCertificacion", () => {
  const secciones = [seccion("s1", "Sección 1"), seccion("s2", "Sección 2"), seccion("s3", "Sección 3")];
  let guardarSeccion: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    push.mockClear();
    guardarSeccion = vi.fn().mockResolvedValue(undefined);
  });

  it("pasoActual inicia en 1 cuando no hay ninguna respuesta guardada", () => {
    const { result } = renderHook(() => useWizardCertificacion({
      certificacionId: "c1", secciones, detalles: [], guardarSeccion,
    }));
    expect(result.current.pasoActual).toBe(1);
    expect(result.current.pasosVisitados.size).toBe(0);
  });

  it("arranca en la primera sección sin respuestas si se recarga a mitad del wizard", () => {
    const { result } = renderHook(() => useWizardCertificacion({
      certificacionId: "c1", secciones, detalles: [{ nodoId: "s1-p1" }], guardarSeccion,
    }));
    expect(result.current.pasoActual).toBe(2);
    expect(result.current.pasosVisitados.has(1)).toBe(true);
  });

  it("avanzar() guarda la sección, marca el paso como visitado y lo incrementa", async () => {
    const { result } = renderHook(() => useWizardCertificacion({
      certificacionId: "c1", secciones, detalles: [], guardarSeccion,
    }));

    await act(async () => { await result.current.avanzar(); });

    expect(guardarSeccion).toHaveBeenCalledWith("s1");
    expect(result.current.pasoActual).toBe(2);
    expect(result.current.pasosVisitados.has(1)).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });

  it("avanzar() en el último paso navega a la revisión en vez de incrementar pasoActual", async () => {
    const { result } = renderHook(() => useWizardCertificacion({
      certificacionId: "c1", secciones, detalles: [{ nodoId: "s1-p1" }, { nodoId: "s2-p1" }], guardarSeccion,
    }));
    expect(result.current.pasoActual).toBe(3);
    expect(result.current.esUltimoPaso).toBe(true);

    await act(async () => { await result.current.avanzar(); });

    expect(push).toHaveBeenCalledWith("/certificaciones/c1/revision");
    expect(result.current.pasoActual).toBe(3);
  });

  it("irAPaso(n) navega si n ya fue visitado", async () => {
    const { result } = renderHook(() => useWizardCertificacion({
      certificacionId: "c1", secciones, detalles: [], guardarSeccion,
    }));
    await act(async () => { await result.current.avanzar(); });

    act(() => { result.current.irAPaso(1); });
    expect(result.current.pasoActual).toBe(1);
  });

  it("irAPaso(n) no hace nada si n no fue visitado y no es el siguiente inmediato", () => {
    const { result } = renderHook(() => useWizardCertificacion({
      certificacionId: "c1", secciones, detalles: [], guardarSeccion,
    }));

    act(() => { result.current.irAPaso(3); });
    expect(result.current.pasoActual).toBe(1);
  });

  it("retroceder() decrementa pasoActual sin volver a llamar guardarSeccion", async () => {
    const { result } = renderHook(() => useWizardCertificacion({
      certificacionId: "c1", secciones, detalles: [], guardarSeccion,
    }));
    await act(async () => { await result.current.avanzar(); });
    guardarSeccion.mockClear();

    act(() => { result.current.retroceder(); });

    expect(result.current.pasoActual).toBe(1);
    expect(guardarSeccion).not.toHaveBeenCalled();
  });
});
