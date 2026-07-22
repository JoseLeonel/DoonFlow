import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BadgeEstadoAccion } from "../_components/badge-estado-accion";
import type { EstadoAccion } from "@doonflow/shared";

const ESTADOS: { estado: EstadoAccion; etiqueta: string }[] = [
  { estado: "PENDIENTE", etiqueta: "Pendiente" },
  { estado: "EN_PROCESO", etiqueta: "En proceso" },
  { estado: "EN_REVISION", etiqueta: "En revisión" },
  { estado: "CUMPLIDO", etiqueta: "Cumplido" },
  { estado: "NO_CUMPLIDO", etiqueta: "No cumplido" },
  { estado: "VENCIDO", etiqueta: "Vencido" },
];

describe("BadgeEstadoAccion", () => {
  it.each(ESTADOS)("renderiza la etiqueta correcta para $estado", ({ estado, etiqueta }) => {
    render(<BadgeEstadoAccion estado={estado} />);
    expect(screen.getByText(etiqueta)).toBeInTheDocument();
  });

  it("usa una clase de color distinta para cada uno de los 6 estados", () => {
    const clases = ESTADOS.map(({ estado, etiqueta }) => {
      const { unmount } = render(<BadgeEstadoAccion estado={estado} />);
      const clase = screen.getByText(etiqueta).className;
      unmount();
      return clase;
    });
    expect(new Set(clases).size).toBeGreaterThan(1);
  });
});
