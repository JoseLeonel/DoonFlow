import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TablaSucursales } from "../_components/tabla-sucursales";
import type { Sucursal } from "../_servicios/sucursal.servicio";

function sucursal(parcial: Partial<Sucursal> = {}): Sucursal {
  return {
    id: "s1",
    empresaId: "e1",
    clienteId: "c1",
    nombre: "Planta Central",
    direccion: "San José, Costa Rica",
    correo: "pc@distsur.com",
    movil: "8888-0001",
    activo: true,
    puntajeVigente: null,
    clasificacionVigente: null,
    creadoEn: "2026-01-01T00:00:00.000Z",
    actualizadoEn: "2026-01-01T00:00:00.000Z",
    ...parcial,
  };
}

describe("TablaSucursales", () => {
  it("muestra estado vacío cuando sucursales = []", () => {
    render(
      <TablaSucursales
        clienteId="c1"
        sucursales={[]}
        cargando={false}
        onAgregar={vi.fn()}
        onModificar={vi.fn()}
        onToggleEstado={vi.fn()}
      />,
    );

    expect(screen.getByText(/no tiene sucursales registradas/i)).toBeInTheDocument();
  });

  it("renderiza filas con nombre, dirección, correo y móvil", () => {
    render(
      <TablaSucursales
        clienteId="c1"
        sucursales={[sucursal()]}
        cargando={false}
        onAgregar={vi.fn()}
        onModificar={vi.fn()}
        onToggleEstado={vi.fn()}
      />,
    );

    expect(screen.getByText("Planta Central")).toBeInTheDocument();
    expect(screen.getByText("San José, Costa Rica")).toBeInTheDocument();
    expect(screen.getByText("pc@distsur.com")).toBeInTheDocument();
    expect(screen.getByText("8888-0001")).toBeInTheDocument();
  });

  it("muestra — cuando puntajeVigente es null", () => {
    render(
      <TablaSucursales
        clienteId="c1"
        sucursales={[sucursal({ puntajeVigente: null })]}
        cargando={false}
        onAgregar={vi.fn()}
        onModificar={vi.fn()}
        onToggleEstado={vi.fn()}
      />,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("muestra el valor cuando puntajeVigente está presente", () => {
    render(
      <TablaSucursales
        clienteId="c1"
        sucursales={[sucursal({ puntajeVigente: 92 })]}
        cargando={false}
        onAgregar={vi.fn()}
        onModificar={vi.fn()}
        onToggleEstado={vi.fn()}
      />,
    );

    expect(screen.getByText("92")).toBeInTheDocument();
  });

  it("muestra badge Activo/Inactivo con el color correcto", () => {
    const { rerender } = render(
      <TablaSucursales
        clienteId="c1"
        sucursales={[sucursal({ activo: true })]}
        cargando={false}
        onAgregar={vi.fn()}
        onModificar={vi.fn()}
        onToggleEstado={vi.fn()}
      />,
    );
    expect(screen.getByText("Activo")).toHaveClass("text-green");

    rerender(
      <TablaSucursales
        clienteId="c1"
        sucursales={[sucursal({ activo: false })]}
        cargando={false}
        onAgregar={vi.fn()}
        onModificar={vi.fn()}
        onToggleEstado={vi.fn()}
      />,
    );
    expect(screen.getByText("Inactivo")).toHaveClass("text-dark-4");
  });

  it("el botón 'Ver historial' tiene el href correcto", () => {
    render(
      <TablaSucursales
        clienteId="c1"
        sucursales={[sucursal({ id: "s9" })]}
        cargando={false}
        onAgregar={vi.fn()}
        onModificar={vi.fn()}
        onToggleEstado={vi.fn()}
      />,
    );

    expect(screen.getByText("Ver historial")).toHaveAttribute(
      "href",
      "/mantenimientos/clientes/c1/sucursales/s9",
    );
  });

  it("llama onAgregar al hacer clic en '+ Agregar sucursal'", async () => {
    const onAgregar = vi.fn();
    render(
      <TablaSucursales
        clienteId="c1"
        sucursales={[sucursal()]}
        cargando={false}
        onAgregar={onAgregar}
        onModificar={vi.fn()}
        onToggleEstado={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Agregar sucursal/ }));
    expect(onAgregar).toHaveBeenCalled();
  });
});
