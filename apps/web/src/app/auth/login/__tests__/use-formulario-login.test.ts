import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useFormularioLogin } from "../_hooks/use-formulario-login";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

const iniciarSesion = vi.fn();
vi.mock("../_servicios/auth.servicio", () => ({
  iniciarSesion: (credenciales: unknown) => iniciarSesion(credenciales),
}));

describe("useFormularioLogin", () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
    iniciarSesion.mockReset();
  });

  it("estado inicial: no está cargando ni tiene error", () => {
    const { result } = renderHook(() => useFormularioLogin());
    expect(result.current.cargando).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("enviar() exitoso navega a la raíz y refresca, sin dejar error", async () => {
    iniciarSesion.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useFormularioLogin());

    await act(async () => { await result.current.enviar("admin@doonflow.demo", "Admin2026!"); });

    expect(iniciarSesion).toHaveBeenCalledWith({ email: "admin@doonflow.demo", password: "Admin2026!" });
    expect(push).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.cargando).toBe(false);
  });

  it("enviar() con credenciales inválidas expone el mensaje de error y no navega", async () => {
    iniciarSesion.mockResolvedValue({ ok: false, mensajeError: "Email o contraseña incorrectos." });
    const { result } = renderHook(() => useFormularioLogin());

    await act(async () => { await result.current.enviar("admin@doonflow.demo", "mal"); });

    expect(result.current.error).toBe("Email o contraseña incorrectos.");
    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("enviar() sin mensajeError expone un mensaje genérico", async () => {
    iniciarSesion.mockResolvedValue({ ok: false });
    const { result } = renderHook(() => useFormularioLogin());

    await act(async () => { await result.current.enviar("a@a.com", "x"); });

    expect(result.current.error).toBe("No se pudo iniciar sesión.");
  });

  it("cargando es true mientras la petición está en curso", async () => {
    let resolver: (value: { ok: boolean }) => void = () => {};
    iniciarSesion.mockReturnValue(new Promise((r) => { resolver = r; }));

    const { result } = renderHook(() => useFormularioLogin());

    let promesaEnviar!: Promise<void>;
    act(() => { promesaEnviar = result.current.enviar("a@a.com", "x"); });

    expect(result.current.cargando).toBe(true);

    await act(async () => { resolver({ ok: true }); await promesaEnviar; });

    expect(result.current.cargando).toBe(false);
  });

  it("un segundo intento limpia el error del intento anterior", async () => {
    iniciarSesion.mockResolvedValueOnce({ ok: false, mensajeError: "Error previo." });
    const { result } = renderHook(() => useFormularioLogin());
    await act(async () => { await result.current.enviar("a@a.com", "x"); });
    expect(result.current.error).toBe("Error previo.");

    iniciarSesion.mockResolvedValueOnce({ ok: true });
    await act(async () => { await result.current.enviar("a@a.com", "correcta"); });

    expect(result.current.error).toBeNull();
  });
});
