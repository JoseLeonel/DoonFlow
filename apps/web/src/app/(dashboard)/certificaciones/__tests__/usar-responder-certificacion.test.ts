import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usarResponderCertificacion } from "../_hooks/usar-responder-certificacion";
import type { CapturaOfflineInyectada } from "../_hooks/usar-responder-certificacion";

const obtenerCertificacion = vi.fn();
vi.mock("../_servicios/certificacion.servicio", () => ({
  obtenerCertificacion: (id: string) => obtenerCertificacion(id),
}));

function certificacionCompleta() {
  return {
    id: "c1",
    plantilla: {
      id: "p1", nombre: "Ficha", puntajeMaximo: 10,
      nodos: [{
        id: "s1", padreId: null, tipo: "PANEL", codigo: "S1", titulo: "Sección 1", orden: 0, nivel: 0, activo: true,
        puntajeMaximo: 0, reglaComentario: "NUNCA", evidenciaObligatoria: false, evidenciaMinima: 0, evidenciaMaxima: 0, opciones: [],
        hijos: [{
          id: "p1", padreId: "s1", tipo: "PREGUNTA", codigo: "S1.1", titulo: "P1", orden: 0, nivel: 1, activo: true,
          tipoRespuesta: "SI_NO", puntajeMaximo: 10, reglaComentario: "NUNCA", evidenciaObligatoria: false,
          evidenciaMinima: 0, evidenciaMaxima: 0, opciones: [], hijos: [],
        }],
      }],
      rangosResultado: [],
    },
    detalles: [],
    evidencias: [],
  };
}

function capturaOfflineMock(): CapturaOfflineInyectada & { guardarRespuestasLote: ReturnType<typeof vi.fn>; guardarEvidencia: ReturnType<typeof vi.fn> } {
  return {
    guardarRespuestasLote: vi.fn().mockResolvedValue(undefined),
    guardarEvidencia: vi.fn().mockResolvedValue(undefined),
  };
}

describe("usarResponderCertificacion", () => {
  let capturaOffline: ReturnType<typeof capturaOfflineMock>;

  beforeEach(() => {
    obtenerCertificacion.mockResolvedValue(certificacionCompleta());
    capturaOffline = capturaOfflineMock();
  });

  it("progresoGlobal se recalcula al guardar la respuesta de una sección", async () => {
    const { result } = renderHook(() => usarResponderCertificacion("c1", capturaOffline));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.progresoGlobal).toBe(0);

    act(() => { result.current.actualizarValor("p1", "SI"); });
    await act(async () => { await result.current.guardarSeccion("s1"); });

    expect(capturaOffline.guardarRespuestasLote).toHaveBeenCalledWith([{ inspeccionId: "c1", nodoId: "p1", valor: "SI" }]);
    expect(result.current.progresoGlobal).toBe(100);
  });

  it("guardarSeccion agrega un detalle sintético (id offline:<nodoId>) para nodos nunca sincronizados, habilitando adjuntar evidencia sin esperar al servidor", async () => {
    const { result } = renderHook(() => usarResponderCertificacion("c1", capturaOffline));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => { result.current.actualizarValor("p1", "SI"); });
    await act(async () => { await result.current.guardarSeccion("s1"); });

    expect(result.current.certificacion?.detalles).toEqual([
      { id: "offline:p1", nodoId: "p1", valor: "SI", valores: [], comentario: null, puntajeObtenido: 0, puntajeMaximo: 0 },
    ]);
  });

  it("subirEvidencia delega en capturaOffline.guardarEvidencia con el nodoId (no requiere detalleId real)", async () => {
    const { result } = renderHook(() => usarResponderCertificacion("c1", capturaOffline));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    const archivo = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    await act(async () => { await result.current.subirEvidencia("p1", archivo); });

    expect(capturaOffline.guardarEvidencia).toHaveBeenCalledWith("p1", archivo);
  });
});
