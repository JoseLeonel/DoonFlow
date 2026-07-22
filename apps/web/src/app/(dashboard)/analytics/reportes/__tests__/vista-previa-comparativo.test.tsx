import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { VistaPreviaComparativo } from "../_components/vista-previa-comparativo";
import type { DatosComparativoSucursales } from "../_servicios/reportes.servicio";

function datos(): DatosComparativoSucursales {
  return {
    clienteId: "c1",
    clienteNombre: "Distribuidora Sur S.A.",
    periodo: { fechaDesde: "2026-06-01", fechaHasta: "2026-06-30" },
    filas: [
      {
        sucursalId: "s1",
        sucursalNombre: "Planta Central",
        puntaje: 92,
        puntajeMaximo: 100,
        porcentajeCumplimiento: 92,
        clasificacion: "Excelente",
        tieneCertificacionEnPeriodo: true,
      },
      {
        sucursalId: "s2",
        sucursalNombre: "Sucursal Norte",
        puntaje: null,
        puntajeMaximo: null,
        porcentajeCumplimiento: null,
        clasificacion: null,
        tieneCertificacionEnPeriodo: false,
      },
    ],
  };
}

describe("VistaPreviaComparativo", () => {
  it("renderiza una columna por sucursal recibida en datos.filas", () => {
    render(<VistaPreviaComparativo datos={datos()} cargando={false} error={null} onReintentar={vi.fn()} />);

    expect(screen.getByText("Planta Central")).toBeInTheDocument();
    expect(screen.getByText("Sucursal Norte")).toBeInTheDocument();
  });

  it("la sucursal sin certificación en el período muestra '—' en la columna de puntaje", () => {
    render(<VistaPreviaComparativo datos={datos()} cargando={false} error={null} onReintentar={vi.fn()} />);

    expect(screen.getByText("92/100")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("la sucursal sin certificación muestra '○ No' con el mismo estilo neutro del resto del proyecto", () => {
    render(<VistaPreviaComparativo datos={datos()} cargando={false} error={null} onReintentar={vi.fn()} />);

    const celdaNo = screen.getByText("○ No");
    expect(celdaNo).toHaveClass("text-dark-4");

    const celdaSi = screen.getByText("● Sí");
    expect(celdaSi).toHaveClass("text-green");
  });
});
