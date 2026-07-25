import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SelloVerificacion } from "../[codigo]/_components/sello-verificacion";

const base = {
  cliente: "Distribuidora Sur S.A.",
  sucursal: "Sucursal Cartago",
  fechaEmision: "2026-01-15",
  fechaVencimiento: "2027-01-15",
  nombrePlantilla: "Inspección Ministerio de Salud 2026",
};

describe("SelloVerificacion", () => {
  it("estado VIGENTE renderiza sello verde con texto Vigente", () => {
    render(<SelloVerificacion resultado={{ ...base, estado: "VIGENTE" }} />);
    expect(screen.getByText("Vigente")).toHaveClass("text-green");
  });

  it("estado VENCIDA renderiza sello gris con texto Vencida", () => {
    render(<SelloVerificacion resultado={{ ...base, estado: "VENCIDA" }} />);
    expect(screen.getByText("Vencida")).toHaveClass("text-dark-5");
  });

  it("resultado null renderiza sello rojo No encontrada", () => {
    render(<SelloVerificacion resultado={null} />);
    expect(screen.getByText("No encontrada")).toHaveClass("text-red");
  });

  it("ningún estado renderiza enlaces de navegación al dashboard", () => {
    const { container: conVigente } = render(<SelloVerificacion resultado={{ ...base, estado: "VIGENTE" }} />);
    expect(conVigente.querySelector("a")).toBeNull();

    const { container: conNull } = render(<SelloVerificacion resultado={null} />);
    expect(conNull.querySelector("a")).toBeNull();
  });
});
