import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { IndicadorProgresoWizard } from "../_components/indicador-progreso-wizard";
import type { PasoIndicador } from "../_components/indicador-progreso-wizard";

const pasos: PasoIndicador[] = [
  { numero: 1, titulo: "Sección 1", visitado: true, completo: true },
  { numero: 2, titulo: "Sección 2", visitado: true, completo: false },
  { numero: 3, titulo: "Sección 3", visitado: false, completo: false },
];

describe("IndicadorProgresoWizard", () => {
  it("resalta el paso actual con aria-current", () => {
    render(<IndicadorProgresoWizard pasos={pasos} pasoActual={2} onIrAPaso={vi.fn()} />);
    expect(screen.getByTestId("paso-2")).toHaveAttribute("aria-current", "step");
    expect(screen.getByTestId("paso-1")).not.toHaveAttribute("aria-current");
  });

  it("clic en un paso visitado llama onIrAPaso", async () => {
    const onIrAPaso = vi.fn();
    render(<IndicadorProgresoWizard pasos={pasos} pasoActual={2} onIrAPaso={onIrAPaso} />);

    await userEvent.click(screen.getByTestId("paso-1"));
    expect(onIrAPaso).toHaveBeenCalledWith(1);
  });

  it("clic en un paso no visitado no llama onIrAPaso (botón deshabilitado)", async () => {
    const onIrAPaso = vi.fn();
    render(<IndicadorProgresoWizard pasos={pasos} pasoActual={2} onIrAPaso={onIrAPaso} />);

    expect(screen.getByTestId("paso-3")).toBeDisabled();
    await userEvent.click(screen.getByTestId("paso-3"));
    expect(onIrAPaso).not.toHaveBeenCalled();
  });

  it("un paso completo (y no actual) muestra el check ADEMÁS del número, sin ocultarlo", () => {
    render(<IndicadorProgresoWizard pasos={pasos} pasoActual={2} onIrAPaso={vi.fn()} />);

    expect(screen.getByTestId("paso-1").querySelector("svg")).toBeInTheDocument();
    expect(screen.getByTestId("paso-1")).toHaveTextContent("1");
  });

  it("un paso incompleto muestra su número, no un check", () => {
    render(<IndicadorProgresoWizard pasos={pasos} pasoActual={1} onIrAPaso={vi.fn()} />);

    expect(screen.getByTestId("paso-2").querySelector("svg")).not.toBeInTheDocument();
    expect(screen.getByTestId("paso-2")).toHaveTextContent("2");
  });

  it("el paso actual muestra su número aunque ya esté completo", () => {
    const pasosConActualCompleto: PasoIndicador[] = [
      { numero: 1, titulo: "Sección 1", visitado: true, completo: true },
    ];
    render(<IndicadorProgresoWizard pasos={pasosConActualCompleto} pasoActual={1} onIrAPaso={vi.fn()} />);

    expect(screen.getByTestId("paso-1").querySelector("svg")).not.toBeInTheDocument();
    expect(screen.getByTestId("paso-1")).toHaveTextContent("1");
  });
});
