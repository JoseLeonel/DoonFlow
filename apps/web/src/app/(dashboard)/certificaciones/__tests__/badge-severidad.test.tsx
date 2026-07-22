import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BadgeSeveridad } from "../_components/badge-severidad";

describe("BadgeSeveridad", () => {
  it("renderiza color distinto para CRITICA", () => {
    render(<BadgeSeveridad severidad="CRITICA" />);
    expect(screen.getByText("Crítica")).toHaveClass("text-red");
  });

  it("renderiza color distinto para MAYOR", () => {
    render(<BadgeSeveridad severidad="MAYOR" />);
    expect(screen.getByText("Mayor")).toHaveClass("text-naranja");
  });

  it("renderiza color distinto para MENOR", () => {
    render(<BadgeSeveridad severidad="MENOR" />);
    expect(screen.getByText("Menor")).toHaveClass("text-yellow-dark");
  });
});
