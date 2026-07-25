import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FormularioLogin } from "../_components/formulario-login";

const enviar = vi.fn();
let cargando = false;
let error: string | null = null;

vi.mock("../_hooks/use-formulario-login", () => ({
  useFormularioLogin: () => ({ enviar, cargando, error }),
}));

const useSearchParams = vi.fn(() => new URLSearchParams());
vi.mock("next/navigation", () => ({ useSearchParams: () => useSearchParams() }));

describe("FormularioLogin", () => {
  beforeEach(() => {
    enviar.mockClear();
    cargando = false;
    error = null;
    useSearchParams.mockReturnValue(new URLSearchParams());
  });

  it("envía email y contraseña al hacer submit", async () => {
    render(<FormularioLogin />);

    await userEvent.type(screen.getByLabelText("Email"), "admin@doonflow.demo");
    await userEvent.type(screen.getByLabelText("Contraseña"), "Admin2026!");
    await userEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(enviar).toHaveBeenCalledWith("admin@doonflow.demo", "Admin2026!");
  });

  it("muestra el mensaje de error cuando el hook lo expone", () => {
    error = "Email o contraseña incorrectos.";
    render(<FormularioLogin />);

    expect(screen.getByText("Email o contraseña incorrectos.")).toBeInTheDocument();
  });

  it("no muestra ningún error cuando el hook no tiene uno", () => {
    render(<FormularioLogin />);
    expect(screen.queryByText(/incorrecto/i)).not.toBeInTheDocument();
  });

  it('muestra el aviso de "sesión expirada" cuando ?motivo=sesion_expirada está en la URL', () => {
    useSearchParams.mockReturnValue(new URLSearchParams("motivo=sesion_expirada"));
    render(<FormularioLogin />);

    expect(screen.getByText(/tu sesión expiró/i)).toBeInTheDocument();
  });

  it("no muestra el aviso de sesión expirada sin el query param", () => {
    render(<FormularioLogin />);
    expect(screen.queryByText(/tu sesión expiró/i)).not.toBeInTheDocument();
  });

  it("deshabilita el botón mientras cargando es true", () => {
    cargando = true;
    render(<FormularioLogin />);
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeDisabled();
  });
});
