import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useFormularioUsuario } from "../_hooks/use-formulario-usuario";

vi.mock("../../clientes/_servicios/sucursal.servicio", () => ({
  listarSucursales: vi.fn().mockResolvedValue([
    { id: "s1", empresaId: "e1", clienteId: "c1", nombre: "Planta Central", activo: true, creadoEn: "2026-01-01", actualizadoEn: "2026-01-01" },
  ]),
}));

describe("useFormularioUsuario", () => {
  it("cambiar el rol resetea clienteId/sucursalId/sucursalesAdicionalesIds", () => {
    const { result } = renderHook(() => useFormularioUsuario());

    act(() => {
      result.current.seleccionarCliente("c1");
    });
    expect(result.current.clienteId).toBe("c1");

    act(() => {
      result.current.cambiarRol("rol-otro");
    });

    expect(result.current.clienteId).toBeNull();
    expect(result.current.sucursalId).toBeNull();
    expect(result.current.sucursalesAdicionalesIds).toEqual([]);
  });

  it("elegir un cliente filtro dispara la carga de sucursales de ese cliente", async () => {
    const { result } = renderHook(() => useFormularioUsuario());

    await act(async () => {
      await result.current.seleccionarClienteFiltro("c1");
    });

    await waitFor(() => {
      expect(result.current.sucursalesDisponibles).toHaveLength(1);
    });
    expect(result.current.sucursalesDisponibles[0]!.nombre).toBe("Planta Central");
  });
});
