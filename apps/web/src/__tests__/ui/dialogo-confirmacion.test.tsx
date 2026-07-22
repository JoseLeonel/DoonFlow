import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { DialogoConfirmacion } from "@doonflow/ui";

describe("DialogoConfirmacion", () => {
  it("no renderiza nada cuando abierto=false", () => {
    const { container } = render(
      <DialogoConfirmacion
        abierto={false}
        titulo="¿Confirmar?"
        mensaje="Acción irreversible."
        onConfirmar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("muestra título y mensaje cuando está abierto", () => {
    render(
      <DialogoConfirmacion
        abierto
        titulo="¿Salir sin guardar?"
        mensaje="Perderás los cambios."
        onConfirmar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );

    expect(screen.getByText("¿Salir sin guardar?")).toBeInTheDocument();
    expect(screen.getByText("Perderás los cambios.")).toBeInTheDocument();
  });

  it("muestra los labels personalizados en los botones", () => {
    render(
      <DialogoConfirmacion
        abierto
        titulo="Título"
        mensaje="Mensaje"
        labelConfirmar="Sí, salir"
        labelCancelar="Quedarme"
        onConfirmar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Sí, salir" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quedarme" })).toBeInTheDocument();
  });

  it("usa labels por defecto cuando no se pasan", () => {
    render(
      <DialogoConfirmacion
        abierto
        titulo="T"
        mensaje="M"
        onConfirmar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("llama onConfirmar al hacer clic en el botón de confirmación", async () => {
    const onConfirmar = vi.fn();
    render(
      <DialogoConfirmacion
        abierto
        titulo="T"
        mensaje="M"
        labelConfirmar="Confirmar"
        onConfirmar={onConfirmar}
        onCancelar={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it("llama onCancelar al hacer clic en el botón de cancelación", async () => {
    const onCancelar = vi.fn();
    render(
      <DialogoConfirmacion
        abierto
        titulo="T"
        mensaje="M"
        onConfirmar={vi.fn()}
        onCancelar={onCancelar}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it("tiene atributos de accesibilidad role=dialog y aria-modal", () => {
    render(
      <DialogoConfirmacion
        abierto
        titulo="Test"
        mensaje="Test"
        onConfirmar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );

    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toBeInTheDocument();
    expect(dialogo).toHaveAttribute("aria-modal", "true");
  });
});
