import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DialogoRechazoPlantilla } from "../_components/dialogo-rechazo-plantilla";

describe("DialogoRechazoPlantilla", () => {
  it("no renderiza nada cuando abierto=false", () => {
    render(
      <DialogoRechazoPlantilla abierto={false} nombrePlantilla="Ficha BPM" onRechazar={vi.fn()} onCancelar={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("el botón Rechazar está deshabilitado sin comentario", () => {
    render(
      <DialogoRechazoPlantilla abierto={true} nombrePlantilla="Ficha BPM" onRechazar={vi.fn()} onCancelar={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Rechazar" })).toBeDisabled();
  });

  it("al escribir un comentario se habilita Rechazar y onRechazar recibe el texto", () => {
    const onRechazar = vi.fn();
    render(
      <DialogoRechazoPlantilla abierto={true} nombrePlantilla="Ficha BPM" onRechazar={onRechazar} onCancelar={vi.fn()} />,
    );

    fireEvent.change(screen.getByPlaceholderText("Ingrese el motivo del rechazo..."), {
      target: { value: "Falta la sección de higiene." },
    });

    const boton = screen.getByRole("button", { name: "Rechazar" });
    expect(boton).not.toBeDisabled();

    fireEvent.click(boton);
    expect(onRechazar).toHaveBeenCalledWith("Falta la sección de higiene.");
  });

  it("onCancelar se llama al hacer clic en Cancelar", () => {
    const onCancelar = vi.fn();
    render(
      <DialogoRechazoPlantilla abierto={true} nombrePlantilla="Ficha BPM" onRechazar={vi.fn()} onCancelar={onCancelar} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancelar).toHaveBeenCalled();
  });
});
