import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FormularioProgramarAuditoria } from "../_components/formulario-programar-auditoria";
import type { SucursalParaFiltro } from "../_servicios/plan-auditoria.servicio";

const SUCURSALES: SucursalParaFiltro[] = [
  { id: "s1", nombre: "Sucursal Cartago" },
  { id: "s2", nombre: "Sucursal Heredia" },
];

describe("FormularioProgramarAuditoria", () => {
  it("renderiza las sucursales recibidas por props en el select", () => {
    render(<FormularioProgramarAuditoria sucursales={SUCURSALES} onGuardar={vi.fn()} onCancelar={vi.fn()} />);
    expect(screen.getByText("Sucursal Cartago")).toBeInTheDocument();
    expect(screen.getByText("Sucursal Heredia")).toBeInTheDocument();
  });

  it("el botón de guardar está deshabilitado sin sucursal ni fecha", () => {
    render(<FormularioProgramarAuditoria sucursales={SUCURSALES} onGuardar={vi.fn()} onCancelar={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Programar certificación" })).toBeDisabled();
  });

  it("con sucursal y fecha, envía los datos correctos a onGuardar", () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    render(<FormularioProgramarAuditoria sucursales={SUCURSALES} onGuardar={onGuardar} onCancelar={vi.fn()} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "s2" } });
    const inputFecha = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(inputFecha, { target: { value: "2026-08-15" } });
    fireEvent.click(screen.getByRole("button", { name: "Programar certificación" }));

    expect(onGuardar).toHaveBeenCalledWith({ sucursalId: "s2", fechaObjetivo: "2026-08-15" });
  });

  it("el botón Cancelar llama onCancelar", () => {
    const onCancelar = vi.fn();
    render(<FormularioProgramarAuditoria sucursales={SUCURSALES} onGuardar={vi.fn()} onCancelar={onCancelar} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });
});
