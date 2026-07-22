import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usarHallazgos } from "../_hooks/usar-hallazgos";

const listarHallazgos = vi.fn();
const crearHallazgo = vi.fn();
const generarHallazgosAutomaticos = vi.fn();
const actualizarHallazgo = vi.fn();
const subirEvidenciaHallazgo = vi.fn();
vi.mock("../_servicios/hallazgo.servicio", () => ({
  listarHallazgos: (id: string) => listarHallazgos(id),
  crearHallazgo: (id: string, datos: unknown) => crearHallazgo(id, datos),
  generarHallazgosAutomaticos: (id: string) => generarHallazgosAutomaticos(id),
  actualizarHallazgo: (id: string, datos: unknown) => actualizarHallazgo(id, datos),
  subirEvidenciaHallazgo: (id: string, archivo: unknown) => subirEvidenciaHallazgo(id, archivo),
}));

describe("usarHallazgos", () => {
  beforeEach(() => {
    listarHallazgos.mockReset();
    crearHallazgo.mockReset();
  });

  it("hayAlMenosUnHallazgo cambia a true tras crearManual()", async () => {
    listarHallazgos.mockResolvedValue([]);
    crearHallazgo.mockResolvedValue({ id: "h1", descripcion: "x", severidad: "MENOR", evidencias: [] });

    const { result } = renderHook(() => usarHallazgos("c1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.hayAlMenosUnHallazgo).toBe(false);

    await act(async () => {
      await result.current.crearManual({ descripcion: "x", severidad: "MENOR" });
    });

    expect(result.current.hayAlMenosUnHallazgo).toBe(true);
  });
});
