import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { WizardCertificacion } from "../_components/wizard-certificacion";

describe("WizardCertificacion", () => {
  it("el botón Anterior está deshabilitado en el paso 1 y dice Siguiente en pasos intermedios", () => {
    render(
      <WizardCertificacion
        totalPasos={3}
        pasoActual={1}
        pasosVisitados={new Set()}
        esUltimoPaso={false}
        guardando={false}
        titulosSecciones={["Sección 1", "Sección 2", "Sección 3"]}
        seccionesCompletas={[false, false, false]}
        onAnterior={vi.fn()}
        onSiguiente={vi.fn()}
        onIrAPaso={vi.fn()}
      >
        <p>Contenido del paso</p>
      </WizardCertificacion>,
    );

    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeInTheDocument();
  });

  it("dice Continuar a revisión en el último paso y llama onSiguiente al hacer clic", async () => {
    const onSiguiente = vi.fn();
    render(
      <WizardCertificacion
        totalPasos={2}
        pasoActual={2}
        pasosVisitados={new Set([1])}
        esUltimoPaso
        guardando={false}
        titulosSecciones={["Sección 1", "Sección 2"]}
        seccionesCompletas={[true, false]}
        onAnterior={vi.fn()}
        onSiguiente={onSiguiente}
        onIrAPaso={vi.fn()}
      >
        <p>Contenido del paso</p>
      </WizardCertificacion>,
    );

    const boton = screen.getByRole("button", { name: "Continuar a revisión" });
    await userEvent.click(boton);
    expect(onSiguiente).toHaveBeenCalledTimes(1);
  });

  it("el botón Anterior habilitado llama onAnterior", async () => {
    const onAnterior = vi.fn();
    render(
      <WizardCertificacion
        totalPasos={2}
        pasoActual={2}
        pasosVisitados={new Set([1])}
        esUltimoPaso
        guardando={false}
        titulosSecciones={["Sección 1", "Sección 2"]}
        seccionesCompletas={[true, false]}
        onAnterior={onAnterior}
        onSiguiente={vi.fn()}
        onIrAPaso={vi.fn()}
      >
        <p>Contenido del paso</p>
      </WizardCertificacion>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(onAnterior).toHaveBeenCalledTimes(1);
  });
});
