import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usarCapturaOffline } from "../_hooks/usar-captura-offline";

let estadoConexionMock: "online" | "offline" = "offline";
vi.mock("../../../../lib/offline/estado-conexion", () => ({
  usarEstadoConexion: () => estadoConexionMock,
}));

const sincronizarLote = vi.fn();
const subirEvidenciaPendiente = vi.fn();
vi.mock("../_servicios/certificacion.servicio", () => ({
  sincronizarLote: (...args: unknown[]) => sincronizarLote(...args),
  subirEvidenciaPendiente: (...args: unknown[]) => subirEvidenciaPendiente(...args),
}));

describe("usarCapturaOffline", () => {
  beforeEach(() => {
    estadoConexionMock = "offline";
    sincronizarLote.mockReset().mockResolvedValue({ procesadas: 1, conflictos: 0, pendientes: 0, sincronizadoEn: new Date().toISOString() });
    subirEvidenciaPendiente.mockReset().mockResolvedValue({ id: "e1" });
  });

  it("guardarRespuestasLote() mientras estadoConexion es 'offline' persiste en IndexedDB y no intenta red", async () => {
    const { result } = renderHook(() => usarCapturaOffline("insp-offline"));

    await act(async () => {
      await result.current.guardarRespuestasLote([{ inspeccionId: "insp-offline", nodoId: "n1", valor: "SI" }]);
    });

    expect(sincronizarLote).not.toHaveBeenCalled();
    expect(result.current.pendientes).toBe(1);
  });

  it("pendientes refleja el conteo real de respuestasPendientes + evidenciasPendientes sin sincronizar", async () => {
    const { result } = renderHook(() => usarCapturaOffline("insp-conteo"));

    await act(async () => {
      await result.current.guardarRespuestasLote([
        { inspeccionId: "insp-conteo", nodoId: "n1", valor: "SI" },
        { inspeccionId: "insp-conteo", nodoId: "n2", valor: "NO" },
      ]);
    });

    expect(result.current.pendientes).toBe(2);
  });

  it("al pasar de offline a online dispara forzarSincronizacion automáticamente", async () => {
    const { result, rerender } = renderHook(() => usarCapturaOffline("insp-reconexion"));

    await act(async () => {
      await result.current.guardarRespuestasLote([{ inspeccionId: "insp-reconexion", nodoId: "n1", valor: "SI" }]);
    });
    expect(sincronizarLote).not.toHaveBeenCalled();

    estadoConexionMock = "online";
    await act(async () => { rerender(); });

    await waitFor(() => expect(sincronizarLote).toHaveBeenCalled());
  });

  it("estadoSincronizacion pasa a 'SINCRONIZADO' solo cuando pendientes llega a 0 tras sincronizar con éxito", async () => {
    estadoConexionMock = "online";
    const { result } = renderHook(() => usarCapturaOffline("insp-sincronizado"));

    await act(async () => {
      await result.current.guardarRespuestasLote([{ inspeccionId: "insp-sincronizado", nodoId: "n1", valor: "SI" }]);
    });

    await waitFor(() => expect(result.current.pendientes).toBe(0));
    await waitFor(() => expect(result.current.estadoSincronizacion).toBe("SINCRONIZADO"));
  });
});
