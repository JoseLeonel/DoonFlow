import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FormularioSucursal } from "../_components/formulario-sucursal";

describe("FormularioSucursal", () => {
  it("renderiza los 4 campos", () => {
    render(<FormularioSucursal guardando={false} error={null} onGuardar={vi.fn()} onCancelar={vi.fn()} />);

    expect(screen.getByPlaceholderText("Planta Central")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("San José, Costa Rica")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("pc@distsur.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("8888-0001")).toBeInTheDocument();
  });

  it("no llama onGuardar si falta el nombre", async () => {
    const onGuardar = vi.fn();
    render(<FormularioSucursal guardando={false} error={null} onGuardar={onGuardar} onCancelar={vi.fn()} />);

    await userEvent.click(screen.getByText("Guardar"));
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it("muestra error y no llama onGuardar con correo de formato inválido", async () => {
    const onGuardar = vi.fn();
    render(<FormularioSucursal guardando={false} error={null} onGuardar={onGuardar} onCancelar={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText("Planta Central"), "Planta Central");
    await userEvent.type(screen.getByPlaceholderText("pc@distsur.com"), "no-es-correo");
    await userEvent.click(screen.getByText("Guardar"));

    expect(screen.getByText(/Formato de correo inválido/)).toBeInTheDocument();
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it("llama onGuardar con los datos cuando los campos son válidos", async () => {
    const onGuardar = vi.fn();
    render(<FormularioSucursal guardando={false} error={null} onGuardar={onGuardar} onCancelar={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText("Planta Central"), "Planta Central");
    await userEvent.click(screen.getByText("Guardar"));

    expect(onGuardar).toHaveBeenCalledWith({
      nombre: "Planta Central",
      direccion: null,
      correo: null,
      movil: null,
    });
  });

  it("guardando = true deshabilita el botón Guardar con spinner", () => {
    render(<FormularioSucursal guardando={true} error={null} onGuardar={vi.fn()} onCancelar={vi.fn()} />);

    expect(screen.getByText("Guardar").closest("button")).toBeDisabled();
  });

  it("clic en Cancelar llama onCancelar", async () => {
    const onCancelar = vi.fn();
    render(<FormularioSucursal guardando={false} error={null} onGuardar={vi.fn()} onCancelar={onCancelar} />);

    await userEvent.click(screen.getByText("Cancelar"));
    expect(onCancelar).toHaveBeenCalled();
  });
});
