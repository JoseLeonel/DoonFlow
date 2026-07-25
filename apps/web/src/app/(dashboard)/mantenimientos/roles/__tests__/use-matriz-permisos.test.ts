import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMatrizPermisos } from "../_hooks/use-matriz-permisos";
import type { MatrizPermisos } from "../_servicios/permisos.servicio";

const matrizInicial: MatrizPermisos = {
  permisos: [
    { id: "p1", codigo: "plantillas.enviar_revision", descripcion: null },
    { id: "p2", codigo: "plantillas.aprobar", descripcion: null },
  ],
  roles: [
    { id: "r-admin", nombre: "administrador", editable: false, permisoIds: ["p1", "p2"] },
    { id: "r-auditor", nombre: "auditor", editable: true, permisoIds: ["p2"] },
  ],
};

const obtenerMatriz = vi.fn();
const guardarPermisosDeRol = vi.fn();

vi.mock("../_servicios/permisos.servicio", () => ({
  obtenerMatriz: (...args: unknown[]) => obtenerMatriz(...args),
  guardarPermisosDeRol: (...args: unknown[]) => guardarPermisosDeRol(...args),
}));

describe("useMatrizPermisos", () => {
  beforeEach(() => {
    obtenerMatriz.mockReset().mockResolvedValue(structuredClone(matrizInicial));
    guardarPermisosDeRol.mockReset().mockResolvedValue(undefined);
  });

  it("carga la matriz al montar", async () => {
    const { result } = renderHook(() => useMatrizPermisos());

    expect(result.current.cargando).toBe(true);

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.matriz).toEqual(matrizInicial);
    expect(result.current.hayCambiosPendientes).toBe(false);
  });

  it("toggle en un rol editable agrega la fila a filasModificadas", async () => {
    const { result } = renderHook(() => useMatrizPermisos());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => {
      result.current.toggle("r-auditor", "p1");
    });

    expect(result.current.hayCambiosPendientes).toBe(true);
    expect(result.current.filasModificadas.get("r-auditor")).toEqual(["p2", "p1"]);
  });

  it("toggle en el rol administrador (no editable) no modifica nada", async () => {
    const { result } = renderHook(() => useMatrizPermisos());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => {
      result.current.toggle("r-admin", "p1");
    });

    expect(result.current.hayCambiosPendientes).toBe(false);
  });

  it("guardarCambios llama al servicio una vez por rol modificado y limpia filasModificadas", async () => {
    const { result } = renderHook(() => useMatrizPermisos());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => {
      result.current.toggle("r-auditor", "p1");
    });

    await act(async () => {
      await result.current.guardarCambios();
    });

    expect(guardarPermisosDeRol).toHaveBeenCalledTimes(1);
    expect(guardarPermisosDeRol).toHaveBeenCalledWith("r-auditor", ["p2", "p1"]);
    expect(result.current.hayCambiosPendientes).toBe(false);
  });
});
