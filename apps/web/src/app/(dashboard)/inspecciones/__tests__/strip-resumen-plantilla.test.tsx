import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { StripResumenPlantilla } from "../_components/strip-resumen-plantilla";
import type { Plantilla } from "@doonflow/shared";

function plantilla(parcial: Partial<Plantilla> = {}): Plantilla {
  return {
    id: "p1",
    empresaId: "e1",
    nombre: "Ficha Calidad",
    tipo: "CALIDAD",
    activa: true,
    puntajeMaximo: 100,
    version: 1,
    creadoEn: new Date("2026-01-01"),
    actualizadoEn: new Date("2026-01-01"),
    estadoAprobacion: "APROBADA",
    ...parcial,
  };
}

const defaultProps = {
  puntajeAcumulado: 0,
  totalPreguntas: 0,
  modo: "lectura" as const,
  onToggleModo: vi.fn(),
  onEditarCabecera: vi.fn(),
  onToggleEstado: vi.fn(),
  onEnviarRevision: vi.fn(),
};

describe("StripResumenPlantilla", () => {
  it("muestra el tipo de inspección y el puntaje máximo", () => {
    render(<StripResumenPlantilla plantilla={plantilla()} {...defaultProps} />);

    expect(screen.getByText("Calidad")).toBeInTheDocument();
    expect(screen.getByText(/Puntaje máx:/)).toBeInTheDocument();
  });

  it("muestra '● Activa' cuando la plantilla está activa", () => {
    render(<StripResumenPlantilla plantilla={plantilla({ activa: true })} {...defaultProps} />);

    expect(screen.getByText(/Activa/)).toBeInTheDocument();
  });

  it("muestra '○ Inactiva' cuando la plantilla está inactiva", () => {
    render(<StripResumenPlantilla plantilla={plantilla({ activa: false })} {...defaultProps} />);

    expect(screen.getByText(/Inactiva/)).toBeInTheDocument();
  });

  it("muestra '— / 100 pts' cuando no hay preguntas", () => {
    render(
      <StripResumenPlantilla
        plantilla={plantilla({ puntajeMaximo: 100 })}
        {...defaultProps}
        totalPreguntas={0}
        puntajeAcumulado={0}
      />,
    );

    expect(screen.getByText(/— \/ 100 pts/)).toBeInTheDocument();
  });

  it("muestra '✓' cuando puntaje acumulado coincide con el máximo", () => {
    render(
      <StripResumenPlantilla
        plantilla={plantilla({ puntajeMaximo: 100 })}
        {...defaultProps}
        totalPreguntas={5}
        puntajeAcumulado={100}
      />,
    );

    expect(screen.getByText(/✓ 100 \/ 100 pts/)).toBeInTheDocument();
  });

  it("muestra '⚠' cuando el puntaje acumulado no coincide con el máximo", () => {
    render(
      <StripResumenPlantilla
        plantilla={plantilla({ puntajeMaximo: 100 })}
        {...defaultProps}
        totalPreguntas={3}
        puntajeAcumulado={70}
      />,
    );

    expect(screen.getByText(/⚠ 70 \/ 100 pts/)).toBeInTheDocument();
  });

  it("llama onToggleModo al hacer clic en 'Editar estructura'", async () => {
    const onToggleModo = vi.fn();
    render(
      <StripResumenPlantilla
        plantilla={plantilla()}
        {...defaultProps}
        onToggleModo={onToggleModo}
        modo="lectura"
      />,
    );

    await userEvent.click(screen.getByText("✎ Editar estructura"));

    expect(onToggleModo).toHaveBeenCalledTimes(1);
  });

  it("llama onEditarCabecera al hacer clic en 'Editar cabecera'", async () => {
    const onEditarCabecera = vi.fn();
    render(
      <StripResumenPlantilla
        plantilla={plantilla()}
        {...defaultProps}
        onEditarCabecera={onEditarCabecera}
      />,
    );

    await userEvent.click(screen.getByText("Editar cabecera"));

    expect(onEditarCabecera).toHaveBeenCalledTimes(1);
  });

  it("llama onToggleEstado al hacer clic en el badge de estado", async () => {
    const onToggleEstado = vi.fn();
    render(
      <StripResumenPlantilla
        plantilla={plantilla()}
        {...defaultProps}
        onToggleEstado={onToggleEstado}
      />,
    );

    await userEvent.click(screen.getByTitle(/Clic para desactivar/));

    expect(onToggleEstado).toHaveBeenCalledTimes(1);
  });

  it("muestra la vigencia formateada cuando existe", () => {
    render(
      <StripResumenPlantilla
        plantilla={plantilla({ fechaVigencia: new Date("2026-12-31T00:00:00Z") })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText(/Vigencia:/)).toBeInTheDocument();
  });

  it("muestra el badge del estado de aprobación", () => {
    render(<StripResumenPlantilla plantilla={plantilla({ estadoAprobacion: "EN_REVISION" })} {...defaultProps} />);

    expect(screen.getByText("En revisión")).toBeInTheDocument();
  });

  it("muestra el botón 'Enviar a revisión' cuando estadoAprobacion es BORRADOR", () => {
    render(
      <StripResumenPlantilla
        plantilla={plantilla({ estadoAprobacion: "BORRADOR" })}
        {...defaultProps}
        totalPreguntas={3}
      />,
    );

    expect(screen.getByText("Enviar a revisión")).toBeInTheDocument();
  });

  it("no muestra el botón 'Enviar a revisión' cuando estadoAprobacion no es BORRADOR", () => {
    render(<StripResumenPlantilla plantilla={plantilla({ estadoAprobacion: "APROBADA" })} {...defaultProps} />);

    expect(screen.queryByText("Enviar a revisión")).not.toBeInTheDocument();
  });

  it("el botón 'Enviar a revisión' está deshabilitado cuando totalPreguntas es 0", () => {
    render(
      <StripResumenPlantilla
        plantilla={plantilla({ estadoAprobacion: "BORRADOR" })}
        {...defaultProps}
        totalPreguntas={0}
      />,
    );

    expect(screen.getByText("Enviar a revisión")).toBeDisabled();
  });

  it("llama onEnviarRevision al hacer clic en 'Enviar a revisión' cuando hay preguntas", async () => {
    const onEnviarRevision = vi.fn();
    render(
      <StripResumenPlantilla
        plantilla={plantilla({ estadoAprobacion: "BORRADOR" })}
        {...defaultProps}
        totalPreguntas={5}
        onEnviarRevision={onEnviarRevision}
      />,
    );

    await userEvent.click(screen.getByText("Enviar a revisión"));

    expect(onEnviarRevision).toHaveBeenCalledTimes(1);
  });
});
