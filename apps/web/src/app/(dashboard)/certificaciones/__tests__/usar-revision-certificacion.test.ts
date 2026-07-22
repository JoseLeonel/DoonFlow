import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usarRevisionCertificacion } from "../_hooks/usar-revision-certificacion";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const obtenerResumenCertificacion = vi.fn();
vi.mock("../_servicios/certificacion.servicio", () => ({
  obtenerResumenCertificacion: (id: string) => obtenerResumenCertificacion(id),
}));

describe("usarRevisionCertificacion", () => {
  beforeEach(() => { push.mockClear(); });

  it("haySeccionesIncompletas es true si alguna sección tiene menos respuestas que preguntas", async () => {
    obtenerResumenCertificacion.mockResolvedValue({
      puntajeObtenido: 5, puntajeMaximo: 10, porcentajeCumplimiento: 50, clasificacion: undefined,
      porSeccion: [{ seccionId: "s1", titulo: "S1", respondidas: 1, total: 2 }],
    });

    const { result } = renderHook(() => usarRevisionCertificacion("c1"));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.haySeccionesIncompletas).toBe(true);
  });

  it("haySeccionesIncompletas es false si todas las secciones están completas", async () => {
    obtenerResumenCertificacion.mockResolvedValue({
      puntajeObtenido: 10, puntajeMaximo: 10, porcentajeCumplimiento: 100, clasificacion: "Aprobado",
      porSeccion: [{ seccionId: "s1", titulo: "S1", respondidas: 2, total: 2 }],
    });

    const { result } = renderHook(() => usarRevisionCertificacion("c1"));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.haySeccionesIncompletas).toBe(false);
  });

  it("guardarYFinalizar navega a la lista de certificaciones sin llamar ningún endpoint de firma", async () => {
    obtenerResumenCertificacion.mockResolvedValue({
      puntajeObtenido: 10, puntajeMaximo: 10, porcentajeCumplimiento: 100, clasificacion: "Aprobado", porSeccion: [],
    });
    const { result } = renderHook(() => usarRevisionCertificacion("c1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    result.current.guardarYFinalizar();

    expect(push).toHaveBeenCalledWith("/certificaciones");
    expect(push).toHaveBeenCalledTimes(1);
  });
});
