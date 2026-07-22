import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FormularioGenerarReporte } from "../_components/formulario-generar-reporte";

const propsBase = {
  tipo: "CONSOLIDADO_CLIENTE" as const,
  onTipoChange: vi.fn(),
  clienteId: "",
  onClienteIdChange: vi.fn(),
  clientes: [{ id: "c1", empresa: "Distribuidora Sur S.A." }],
  clienteFijo: null,
  sucursalIds: [] as string[],
  onSucursalIdsChange: vi.fn(),
  sucursalesDelCliente: [{ id: "s1", nombre: "Planta Central" }],
  fechaDesde: "",
  onFechaDesdeChange: vi.fn(),
  fechaHasta: "",
  onFechaHastaChange: vi.fn(),
  formato: "PDF" as const,
  onFormatoChange: vi.fn(),
  generando: false,
  onGenerar: vi.fn(),
};

describe("FormularioGenerarReporte", () => {
  it("el botón 'Generar' está deshabilitado sin clienteId", () => {
    render(<FormularioGenerarReporte {...propsBase} fechaDesde="2026-06-01" fechaHasta="2026-06-30" />);
    expect(screen.getByText("Generar")).toBeDisabled();
  });

  it("el botón 'Generar' está deshabilitado sin fechaDesde/fechaHasta", () => {
    render(<FormularioGenerarReporte {...propsBase} clienteId="c1" />);
    expect(screen.getByText("Generar")).toBeDisabled();
  });

  it("con tipo COMPARATIVO_SUCURSALES sin sucursalIds seleccionadas, el botón permanece deshabilitado", () => {
    render(
      <FormularioGenerarReporte
        {...propsBase}
        tipo="COMPARATIVO_SUCURSALES"
        clienteId="c1"
        fechaDesde="2026-06-01"
        fechaHasta="2026-06-30"
        sucursalIds={[]}
      />,
    );
    expect(screen.getByText("Generar")).toBeDisabled();
  });

  it("cambiar el cliente llama a onClienteIdChange", () => {
    const onClienteIdChange = vi.fn();
    render(<FormularioGenerarReporte {...propsBase} onClienteIdChange={onClienteIdChange} />);

    fireEvent.change(screen.getByDisplayValue("Selecciona un cliente"), { target: { value: "c1" } });

    expect(onClienteIdChange).toHaveBeenCalledWith("c1");
  });

  it("clic en 'Generar' con filtros válidos llama onGenerar", () => {
    const onGenerar = vi.fn();
    render(
      <FormularioGenerarReporte
        {...propsBase}
        clienteId="c1"
        fechaDesde="2026-06-01"
        fechaHasta="2026-06-30"
        onGenerar={onGenerar}
      />,
    );

    fireEvent.click(screen.getByText("Generar"));

    expect(onGenerar).toHaveBeenCalledTimes(1);
  });
});
