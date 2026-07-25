import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useHallazgos } from "../_hooks/use-hallazgos";

const listarHallazgos = vi.fn();
const crearHallazgo = vi.fn();
const generarHallazgosAutomaticos = vi.fn();
const generarHallazgosDesdeComentarios = vi.fn();
const actualizarHallazgo = vi.fn();
const subirEvidenciaHallazgo = vi.fn();
vi.mock("../_servicios/hallazgo.servicio", () => ({
  listarHallazgos: (id: string) => listarHallazgos(id),
  crearHallazgo: (id: string, datos: unknown) => crearHallazgo(id, datos),
  generarHallazgosAutomaticos: (id: string) => generarHallazgosAutomaticos(id),
  generarHallazgosDesdeComentarios: (id: string) => generarHallazgosDesdeComentarios(id),
  actualizarHallazgo: (id: string, datos: unknown) => actualizarHallazgo(id, datos),
  subirEvidenciaHallazgo: (id: string, archivo: unknown) => subirEvidenciaHallazgo(id, archivo),
}));

describe("useHallazgos", () => {
  beforeEach(() => {
    listarHallazgos.mockReset();
    crearHallazgo.mockReset();
  });

  it("hayAlMenosUnHallazgo cambia a true tras crearManual()", async () => {
    listarHallazgos.mockResolvedValue([]);
    crearHallazgo.mockResolvedValue({ id: "h1", descripcion: "x", categoria: "NO_CONFORMIDAD", severidad: "MENOR", evidencias: [] });

    const { result } = renderHook(() => useHallazgos("c1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.hayAlMenosUnHallazgo).toBe(false);

    await act(async () => {
      await result.current.crearManual({ descripcion: "x", categoria: "NO_CONFORMIDAD", severidad: "MENOR" });
    });

    expect(result.current.hayAlMenosUnHallazgo).toBe(true);
  });
});
