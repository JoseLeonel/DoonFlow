import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BadgeEstadoApelacion } from "../_components/badge-estado-apelacion";

describe("BadgeEstadoApelacion", () => {
  it("ABIERTA/EN_REVISION → clase amarilla", () => {
    render(<BadgeEstadoApelacion estado="ABIERTA" />);
    expect(screen.getByText("● Abierta")).toHaveClass("text-yellow-dark");

    render(<BadgeEstadoApelacion estado="EN_REVISION" />);
    expect(screen.getByText("● En revisión")).toHaveClass("text-yellow-dark");
  });

  it("ACEPTADA → clase verde", () => {
    render(<BadgeEstadoApelacion estado="ACEPTADA" />);
    expect(screen.getByText("● Aceptada")).toHaveClass("text-green");
  });

  it("RECHAZADA → clase roja", () => {
    render(<BadgeEstadoApelacion estado="RECHAZADA" />);
    expect(screen.getByText("● Rechazada")).toHaveClass("text-red");
  });
});
