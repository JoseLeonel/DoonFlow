import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FormularioApelacion } from "../_components/formulario-apelacion";

const hallazgo = { id: "h1", inspeccionId: "c1", descripcion: "Extintor vencido", categoria: "NO_CONFORMIDAD" as const, severidad: "CRITICA" as const, estado: "ACTIVO" as const, creadoEn: "", evidencias: [] };
const diasRestantes = { dias: 9, fechaLimite: new Date("2026-07-25") };

describe("FormularioApelacion", () => {
  it("renderiza el selector de tipo y el textarea de motivo", () => {
    render(
      <FormularioApelacion
        hallazgosActivos={[hallazgo]} diasRestantes={diasRestantes} plazoVencido={false}
        guardando={false} error={null} onEnviar={vi.fn()} onCancelar={vi.fn()}
      />,
    );
    expect(screen.getByText("Un hallazgo específico")).toBeInTheDocument();
    expect(screen.getByText("El resultado general")).toBeInTheDocument();
    expect(screen.getByText("Motivo *")).toBeInTheDocument();
  });

  it("al elegir 'Sobre un hallazgo específico' aparece el selector de hallazgos", () => {
    render(
      <FormularioApelacion
        hallazgosActivos={[hallazgo]} diasRestantes={diasRestantes} plazoVencido={false}
        guardando={false} error={null} onEnviar={vi.fn()} onCancelar={vi.fn()}
      />,
    );
    expect(screen.queryByText("Hallazgo *")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Un hallazgo específico"));
    expect(screen.getByText("Hallazgo *")).toBeInTheDocument();
  });

  it("intento de enviar con motivo de menos de 10 caracteres no llama onEnviar", () => {
    const onEnviar = vi.fn();
    render(
      <FormularioApelacion
        hallazgosActivos={[hallazgo]} diasRestantes={diasRestantes} plazoVencido={false}
        guardando={false} error={null} onEnviar={onEnviar} onCancelar={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "corto" } });
    expect(screen.getByRole("button", { name: "Enviar apelación" })).toBeDisabled();
    expect(onEnviar).not.toHaveBeenCalled();
  });

  it("con datos válidos, clic en Enviar apelación llama onEnviar con los datos correctos", () => {
    const onEnviar = vi.fn();
    render(
      <FormularioApelacion
        hallazgosActivos={[hallazgo]} diasRestantes={diasRestantes} plazoVencido={false}
        guardando={false} error={null} onEnviar={onEnviar} onCancelar={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Motivo con más de diez caracteres" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar apelación" }));
    expect(onEnviar).toHaveBeenCalledWith({ tipo: "SOBRE_RESULTADO", hallazgoId: undefined, motivo: "Motivo con más de diez caracteres" });
  });

  it("guardando = true deshabilita el botón", () => {
    render(
      <FormularioApelacion
        hallazgosActivos={[hallazgo]} diasRestantes={diasRestantes} plazoVencido={false}
        guardando={true} error={null} onEnviar={vi.fn()} onCancelar={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Enviando..." })).toBeDisabled();
  });
});
