import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usarRevisionCertificacion } from "../_hooks/usar-revision-certificacion";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const obtenerResumenCertificacion = vi.fn();
const obtenerCertificacion = vi.fn();
const firmarCertificacion = vi.fn();
vi.mock("../_servicios/certificacion.servicio", () => ({
  obtenerResumenCertificacion: (id: string) => obtenerResumenCertificacion(id),
  obtenerCertificacion: (id: string) => obtenerCertificacion(id),
  firmarCertificacion: (id: string, pendientes: number) => firmarCertificacion(id, pendientes),
}));

const listarHallazgos = vi.fn();
vi.mock("../_servicios/hallazgo.servicio", () => ({
  listarHallazgos: (id: string) => listarHallazgos(id),
}));

const obtenerPlan = vi.fn();
vi.mock("../_servicios/plan-cumplimiento.servicio", () => ({
  obtenerPlan: (id: string) => obtenerPlan(id),
}));

function certificacionEnProgreso(parcial: Record<string, unknown> = {}) {
  return {
    id: "c1", estado: "EN_PROGRESO", codigoVerificacion: null, pdfUrl: null, firmadoEn: null,
    ...parcial,
  };
}

describe("usarRevisionCertificacion", () => {
  beforeEach(() => {
    push.mockClear();
    obtenerCertificacion.mockReset();
    obtenerCertificacion.mockResolvedValue(certificacionEnProgreso());
    listarHallazgos.mockReset();
    listarHallazgos.mockResolvedValue([]);
    obtenerPlan.mockReset();
    obtenerPlan.mockResolvedValue(null);
  });

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
    expect(firmarCertificacion).not.toHaveBeenCalled();
  });

  it("puedeFirmar es true cuando la certificación está EN_PROGRESO", async () => {
    obtenerResumenCertificacion.mockResolvedValue({
      puntajeObtenido: 10, puntajeMaximo: 10, porcentajeCumplimiento: 100, clasificacion: "Aprobado", porSeccion: [],
    });
    const { result } = renderHook(() => usarRevisionCertificacion("c1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.puedeFirmar).toBe(true);
  });

  it("puedeFirmar es false cuando la certificación ya está FIRMADA", async () => {
    obtenerResumenCertificacion.mockResolvedValue({
      puntajeObtenido: 10, puntajeMaximo: 10, porcentajeCumplimiento: 100, clasificacion: "Aprobado", porSeccion: [],
    });
    obtenerCertificacion.mockResolvedValue(certificacionEnProgreso({ estado: "FIRMADA", codigoVerificacion: "ABC123" }));

    const { result } = renderHook(() => usarRevisionCertificacion("c1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.puedeFirmar).toBe(false);
  });

  it("firmar() exitoso actualiza la certificación con el código de verificación", async () => {
    obtenerResumenCertificacion.mockResolvedValue({
      puntajeObtenido: 10, puntajeMaximo: 10, porcentajeCumplimiento: 100, clasificacion: "Aprobado", porSeccion: [],
    });
    firmarCertificacion.mockResolvedValue(certificacionEnProgreso({ estado: "FIRMADA", codigoVerificacion: "ABC123", pdfUrl: "http://x/c.pdf" }));

    const { result } = renderHook(() => usarRevisionCertificacion("c1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => { await result.current.firmar(0); });

    expect(firmarCertificacion).toHaveBeenCalledWith("c1", 0);
    expect(result.current.certificacion?.codigoVerificacion).toBe("ABC123");
    expect(result.current.errorFirma).toBeNull();
  });

  // ── 013-hallazgos-plan-cumplimiento ────────────────────────────────────

  it("puedeFirmar es false con un hallazgo CRITICA sin ninguna acción cumplida", async () => {
    obtenerResumenCertificacion.mockResolvedValue({
      puntajeObtenido: 10, puntajeMaximo: 10, porcentajeCumplimiento: 100, clasificacion: "Aprobado", porSeccion: [],
    });
    listarHallazgos.mockResolvedValue([{ id: "h1", severidad: "CRITICA", descripcion: "Extintor vencido", evidencias: [] }]);
    obtenerPlan.mockResolvedValue(null);

    const { result } = renderHook(() => usarRevisionCertificacion("c1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.puedeFirmar).toBe(false);
  });

  it("puedeFirmar es true sin hallazgos críticos (solo MAYOR/MENOR o ninguno)", async () => {
    obtenerResumenCertificacion.mockResolvedValue({
      puntajeObtenido: 10, puntajeMaximo: 10, porcentajeCumplimiento: 100, clasificacion: "Aprobado", porSeccion: [],
    });
    listarHallazgos.mockResolvedValue([{ id: "h1", severidad: "MENOR", descripcion: "Detalle menor", evidencias: [] }]);
    obtenerPlan.mockResolvedValue(null);

    const { result } = renderHook(() => usarRevisionCertificacion("c1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.puedeFirmar).toBe(true);
  });

  it("puedeFirmar es true con un hallazgo CRITICA que ya tiene una acción CUMPLIDO", async () => {
    obtenerResumenCertificacion.mockResolvedValue({
      puntajeObtenido: 10, puntajeMaximo: 10, porcentajeCumplimiento: 100, clasificacion: "Aprobado", porSeccion: [],
    });
    listarHallazgos.mockResolvedValue([{ id: "h1", severidad: "CRITICA", descripcion: "Extintor vencido", evidencias: [] }]);
    obtenerPlan.mockResolvedValue({
      id: "plan1", acciones: [{ id: "a1", hallazgoId: "h1", estado: "CUMPLIDO" }],
    });

    const { result } = renderHook(() => usarRevisionCertificacion("c1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.puedeFirmar).toBe(true);
  });

  it("firmar() con error expone el mensaje en errorFirma", async () => {
    obtenerResumenCertificacion.mockResolvedValue({
      puntajeObtenido: 10, puntajeMaximo: 10, porcentajeCumplimiento: 100, clasificacion: "Aprobado", porSeccion: [],
    });
    firmarCertificacion.mockRejectedValue(new Error("No se puede firmar: hay 2 respuestas o evidencias sin sincronizar."));

    const { result } = renderHook(() => usarRevisionCertificacion("c1"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => { await result.current.firmar(2); });

    expect(result.current.errorFirma).toMatch(/sin sincronizar/);
  });
});
