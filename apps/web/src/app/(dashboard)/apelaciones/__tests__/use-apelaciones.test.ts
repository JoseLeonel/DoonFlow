import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useApelaciones } from "../_hooks/use-apelaciones";

const listarApelacionesAbiertas = vi.fn();
vi.mock("../_servicios/apelacion.servicio", () => ({
  listarApelacionesAbiertas: () => listarApelacionesAbiertas(),
}));

describe("useApelaciones", () => {
  beforeEach(() => {
    listarApelacionesAbiertas.mockReset();
  });

  it("recargar() actualiza apelaciones y limpia error en éxito", async () => {
    listarApelacionesAbiertas.mockResolvedValue([{ id: "a1" }]);

    const { result } = renderHook(() => useApelaciones());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.apelaciones).toEqual([{ id: "a1" }]);
    expect(result.current.error).toBeNull();
  });

  it("setea error si el servicio falla", async () => {
    listarApelacionesAbiertas.mockRejectedValue(new Error("No tienes permiso para realizar esta acción."));

    const { result } = renderHook(() => useApelaciones());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.error).toBe("No tienes permiso para realizar esta acción.");
    expect(result.current.apelaciones).toEqual([]);
  });
});
