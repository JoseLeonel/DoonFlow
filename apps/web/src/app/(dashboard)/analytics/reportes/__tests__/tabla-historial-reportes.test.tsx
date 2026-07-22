import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TablaHistorialReportes } from "../_components/tabla-historial-reportes";
import type { ReporteHistorialItem } from "../_servicios/reportes.servicio";

function reporte(parcial: Partial<ReporteHistorialItem> = {}): ReporteHistorialItem {
  return {
    id: "r1",
    empresaId: "e1",
    tipo: "CONSOLIDADO_CLIENTE",
    filtros: { clienteId: "c1", fechaDesde: "2026-06-01", fechaHasta: "2026-06-30" },
    formato: "PDF",
    url: "http://localhost/archivos/reportes/r1.pdf",
    generadoPorId: "u1",
    creadoEn: "2026-07-16T00:00:00.000Z",
    resumenFiltros: "Distribuidora Sur S.A. · 01/06/2026 – 30/06/2026",
    generadoPorNombre: "Juan Pérez",
    ...parcial,
  };
}

describe("TablaHistorialReportes", () => {
  it("con reportes = [] muestra el estado vacío", () => {
    render(<TablaHistorialReportes reportes={[]} cargando={false} onDescargar={vi.fn()} />);
    expect(screen.getByText("Todavía no se ha generado ningún reporte.")).toBeInTheDocument();
  });

  it("muestra 'Cargando' (skeleton) mientras cargando es true", () => {
    const { container } = render(<TablaHistorialReportes reportes={[]} cargando={true} onDescargar={vi.fn()} />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renderiza filas con Tipo, Filtros, Formato, Generado por y Fecha", () => {
    render(<TablaHistorialReportes reportes={[reporte()]} cargando={false} onDescargar={vi.fn()} />);

    expect(screen.getByText("Consolidado")).toBeInTheDocument();
    expect(screen.getByText("Distribuidora Sur S.A. · 01/06/2026 – 30/06/2026")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
  });

  it("el botón 'Descargar' de una fila llama onDescargar(id)", () => {
    const onDescargar = vi.fn();
    render(<TablaHistorialReportes reportes={[reporte({ id: "r9" })]} cargando={false} onDescargar={onDescargar} />);

    fireEvent.click(screen.getByText("Descargar"));

    expect(onDescargar).toHaveBeenCalledWith("r9");
  });
});
