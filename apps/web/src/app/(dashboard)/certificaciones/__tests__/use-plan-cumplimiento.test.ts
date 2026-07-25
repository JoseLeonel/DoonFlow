import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePlanCumplimiento } from "../_hooks/use-plan-cumplimiento";

const listarHallazgos = vi.fn();
vi.mock("../_servicios/hallazgo.servicio", () => ({
  listarHallazgos: (id: string) => listarHallazgos(id),
}));

const obtenerPlan = vi.fn();
vi.mock("../_servicios/plan-cumplimiento.servicio", () => ({
  obtenerPlan: (id: string) => obtenerPlan(id),
  generarPlan: vi.fn(),
  cerrarPlan: vi.fn(),
  reabrirPlan: vi.fn(),
  crearAccion: vi.fn(),
  actualizarAccion: vi.fn(),
}));

describe("usePlanCumplimiento", () => {
  beforeEach(() => {
    listarHallazgos.mockReset();
    obtenerPlan.mockReset();
  });

  it("puedeCerrarse es false si algún hallazgo no tiene acción CUMPLIDO", async () => {
    listarHallazgos.mockResolvedValue([
      { id: "h1", descripcion: "a", severidad: "MENOR", evidencias: [] },
      { id: "h2", descripcion: "b", severidad: "MENOR", evidencias: [] },
    ]);
    obtenerPlan.mockResolvedValue({
      id: "plan1", estado: "EN_SEGUIMIENTO",
      acciones: [{ id: "a1", hallazgoId: "h1", estado: "CUMPLIDO" }],
      indicadores: { total: 1, pendientes: 0, enProceso: 0, enRevision: 0, cumplidas: 1, noCumplidas: 0, vencidas: 0, porcentajeCumplimiento: 100, proximasAVencer: 0 },
    });

    const { result } = renderHook(() => usePlanCumplimiento("c1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.puedeCerrarse).toBe(false);
  });

  it("puedeCerrarse es true si todos los hallazgos tienen al menos una acción CUMPLIDO", async () => {
    listarHallazgos.mockResolvedValue([{ id: "h1", descripcion: "a", severidad: "MENOR", evidencias: [] }]);
    obtenerPlan.mockResolvedValue({
      id: "plan1", estado: "EN_SEGUIMIENTO",
      acciones: [{ id: "a1", hallazgoId: "h1", estado: "CUMPLIDO" }],
      indicadores: { total: 1, pendientes: 0, enProceso: 0, enRevision: 0, cumplidas: 1, noCumplidas: 0, vencidas: 0, porcentajeCumplimiento: 100, proximasAVencer: 0 },
    });

    const { result } = renderHook(() => usePlanCumplimiento("c1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.puedeCerrarse).toBe(true);
  });
});
