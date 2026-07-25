import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useImportacionExcel } from "../use-importacion-excel";

const previsualizarImportacion = vi.fn();
const confirmarImportacion = vi.fn();
const descargarPlantilla = vi.fn();
const descargarErroresLote = vi.fn();

vi.mock("../../_servicios-compartidos/importacion.servicio", () => ({
  previsualizarImportacion: (...args: unknown[]) => previsualizarImportacion(...args),
  confirmarImportacion: (...args: unknown[]) => confirmarImportacion(...args),
  descargarPlantilla: (...args: unknown[]) => descargarPlantilla(...args),
  descargarErroresLote: (...args: unknown[]) => descargarErroresLote(...args),
}));

function archivoFalso(): File {
  return new File(["contenido"], "clientes.xlsx");
}

describe("useImportacionExcel", () => {
  beforeEach(() => {
    previsualizarImportacion.mockReset().mockResolvedValue({
      totalFilas: 2,
      filasValidas: [{ nombre: "A" }],
      filasConError: [{ fila: 3, datos: {}, error: "malo" }],
    });
    confirmarImportacion.mockReset().mockResolvedValue({ id: "lote1", filasExitosas: 1, filasConError: 1 });
  });

  it("transiciona INACTIVO → ARCHIVO_SELECCIONADO → PREVISUALIZANDO → PREVISUALIZADO en el flujo feliz", async () => {
    const { result } = renderHook(() => useImportacionExcel("CLIENTE"));
    expect(result.current.estado).toBe("INACTIVO");

    act(() => { result.current.seleccionarArchivo(archivoFalso()); });
    expect(result.current.estado).toBe("ARCHIVO_SELECCIONADO");

    act(() => { result.current.previsualizar(); });
    await waitFor(() => expect(result.current.estado).toBe("PREVISUALIZADO"));

    expect(result.current.resumen).toEqual({ totalFilas: 2, filasValidas: 1, filasConError: 1 });
  });

  it("puedeConfirmar es true solo cuando hay filasValidas", async () => {
    const { result } = renderHook(() => useImportacionExcel("CLIENTE"));
    act(() => { result.current.seleccionarArchivo(archivoFalso()); });
    await act(async () => { await result.current.previsualizar(); });

    expect(result.current.puedeConfirmar).toBe(true);
  });

  it("reiniciar() vuelve el estado a INACTIVO y limpia el archivo seleccionado", async () => {
    const { result } = renderHook(() => useImportacionExcel("CLIENTE"));
    act(() => { result.current.seleccionarArchivo(archivoFalso()); });
    await act(async () => { await result.current.previsualizar(); });

    act(() => { result.current.reiniciar(); });

    expect(result.current.estado).toBe("INACTIVO");
    expect(result.current.archivo).toBeNull();
    expect(result.current.preview).toBeNull();
  });

  it("confirmar() llama confirmarImportacion y pasa a COMPLETADO", async () => {
    const { result } = renderHook(() => useImportacionExcel("CLIENTE"));
    act(() => { result.current.seleccionarArchivo(archivoFalso()); });
    await act(async () => { await result.current.previsualizar(); });

    await act(async () => { await result.current.confirmar(); });

    expect(confirmarImportacion).toHaveBeenCalledWith("CLIENTE", expect.any(File));
    expect(result.current.estado).toBe("COMPLETADO");
  });
});
