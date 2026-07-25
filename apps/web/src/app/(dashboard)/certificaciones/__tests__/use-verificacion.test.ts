import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useVerificacion } from "../_hooks/use-verificacion";

const listarAccionesEnRevision = vi.fn();
const verificarAccion = vi.fn();
vi.mock("../_servicios/plan-cumplimiento.servicio", () => ({
  listarAccionesEnRevision: () => listarAccionesEnRevision(),
  verificarAccion: (id: string, resultado: string, comentario: string, nuevaFechaLimite?: string) =>
    verificarAccion(id, resultado, comentario, nuevaFechaLimite),
}));

function accion(parcial: Record<string, unknown> = {}) {
  return {
    id: "a1", planCumplimientoId: "plan1", hallazgoId: "h1", descripcion: "Acción",
    responsableId: "u1", responsableNombre: "Juan", fechaLimite: "2026-08-01",
    estado: "EN_REVISION", porcentajeAvance: 80, evidencias: [],
    ...parcial,
  };
}

describe("useVerificacion", () => {
  beforeEach(() => {
    listarAccionesEnRevision.mockReset();
    verificarAccion.mockReset();
  });

  it('verificar("NO_CUMPLIDO", comentario, nuevaFechaLimite) llama al servicio con los 3 parámetros', async () => {
    listarAccionesEnRevision.mockResolvedValue([accion()]);
    verificarAccion.mockResolvedValue(accion({ estado: "EN_PROCESO" }));

    const { result } = renderHook(() => useVerificacion());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => {
      await result.current.verificar("a1", "NO_CUMPLIDO", "Falta evidencia", "2026-09-01");
    });

    expect(verificarAccion).toHaveBeenCalledWith("a1", "NO_CUMPLIDO", "Falta evidencia", "2026-09-01");
  });

  it("al verificar, la acción desaparece de la lista de en revisión", async () => {
    listarAccionesEnRevision.mockResolvedValue([accion()]);
    verificarAccion.mockResolvedValue(accion({ estado: "CUMPLIDO" }));

    const { result } = renderHook(() => useVerificacion());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.acciones).toHaveLength(1);

    await act(async () => {
      await result.current.verificar("a1", "CUMPLIDO", "Resuelto");
    });

    expect(result.current.acciones).toHaveLength(0);
  });
});
