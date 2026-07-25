import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSeguimiento } from "../_hooks/use-seguimiento";

const listarMisAcciones = vi.fn();
const actualizarAvanceAccion = vi.fn();
const enviarAccionARevision = vi.fn();
vi.mock("../_servicios/plan-cumplimiento.servicio", () => ({
  listarMisAcciones: () => listarMisAcciones(),
  actualizarAvanceAccion: (id: string, p: number) => actualizarAvanceAccion(id, p),
  enviarAccionARevision: (id: string) => enviarAccionARevision(id),
  subirEvidenciaAccion: vi.fn(),
}));

function accion(parcial: Record<string, unknown> = {}) {
  return {
    id: "a1", planCumplimientoId: "plan1", hallazgoId: "h1", descripcion: "Acción",
    responsableId: "u1", responsableNombre: "Juan", fechaLimite: "2026-08-01",
    estado: "EN_PROCESO", porcentajeAvance: 40, evidencias: [],
    ...parcial,
  };
}

describe("useSeguimiento", () => {
  beforeEach(() => {
    listarMisAcciones.mockReset();
    actualizarAvanceAccion.mockReset();
    enviarAccionARevision.mockReset();
  });

  it("actualizarAvance() llama al servicio con el porcentajeAvance correcto", async () => {
    listarMisAcciones.mockResolvedValue([accion()]);
    actualizarAvanceAccion.mockResolvedValue(accion({ porcentajeAvance: 75 }));

    const { result } = renderHook(() => useSeguimiento());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => { await result.current.actualizarAvance("a1", 75); });

    expect(actualizarAvanceAccion).toHaveBeenCalledWith("a1", 75);
  });

  it("enviarARevision() cambia el estado local a EN_REVISION de forma optimista", async () => {
    listarMisAcciones.mockResolvedValue([accion()]);
    let resolver: (value: unknown) => void = () => {};
    enviarAccionARevision.mockReturnValue(new Promise((r) => { resolver = r; }));

    const { result } = renderHook(() => useSeguimiento());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => { result.current.enviarARevision("a1"); });

    expect(result.current.acciones[0]?.estado).toBe("EN_REVISION");

    await act(async () => { resolver(accion({ estado: "EN_REVISION" })); });
  });
});
