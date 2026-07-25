import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TarjetaAceptacionCertificacion } from "../_components/tarjeta-aceptacion-certificacion";

describe("TarjetaAceptacionCertificacion", () => {
  it("no renderiza nada si visible = false", () => {
    const { container } = render(
      <TarjetaAceptacionCertificacion visible={false} certificacionId="c1" aceptando={false} error={null} onAceptar={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza el texto cuando visible = true", () => {
    render(
      <TarjetaAceptacionCertificacion visible={true} certificacionId="c1" aceptando={false} error={null} onAceptar={vi.fn()} />,
    );
    expect(screen.getByText("Certificación pendiente de tu confirmación")).toBeInTheDocument();
  });

  it("el botón Aceptar llama onAceptar", () => {
    const onAceptar = vi.fn();
    render(
      <TarjetaAceptacionCertificacion visible={true} certificacionId="c1" aceptando={false} error={null} onAceptar={onAceptar} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(onAceptar).toHaveBeenCalledTimes(1);
  });

  it("el enlace de apelación navega a /certificaciones/[id]/apelacion/nueva", () => {
    render(
      <TarjetaAceptacionCertificacion visible={true} certificacionId="c1" aceptando={false} error={null} onAceptar={vi.fn()} />,
    );
    expect(screen.getByText("Presentar apelación en su lugar →")).toHaveAttribute("href", "/certificaciones/c1/apelacion/nueva");
  });
});
