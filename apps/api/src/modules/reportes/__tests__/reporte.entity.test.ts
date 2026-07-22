import { describe, it, expect } from "vitest";
import { construirResumenFiltros, puedeGenerarReporte } from "../domain/reporte.entity";

describe("construirResumenFiltros", () => {
  it("con un solo cliente y rango de fechas retorna el texto esperado", () => {
    const resumen = construirResumenFiltros(
      { clienteId: "c1", fechaDesde: "2026-06-01", fechaHasta: "2026-06-30" },
      "Distribuidora Sur S.A.",
    );
    expect(resumen).toBe("Distribuidora Sur S.A. · 01/06/2026 – 30/06/2026");
  });

  it("con comparativo de sucursales (varias sucursalIds) incluye la cantidad de sucursales", () => {
    const resumen = construirResumenFiltros(
      { clienteId: "c1", sucursalIds: ["s1", "s2", "s3"], fechaDesde: "2026-06-01", fechaHasta: "2026-06-30" },
      "Distribuidora Sur S.A.",
    );
    expect(resumen).toBe("Distribuidora Sur S.A. (3 suc.) · 01/06/2026 – 30/06/2026");
  });
});

describe("puedeGenerarReporte", () => {
  it("administrador (alcance TOTAL) siempre puede, sin importar el clienteId", () => {
    expect(puedeGenerarReporte({ tipo: "TOTAL" }, "cualquier-cliente")).toBe(true);
  });

  it("administrador_cliente (alcance CLIENTE) puede si el clienteId coincide", () => {
    expect(puedeGenerarReporte({ tipo: "CLIENTE", clienteId: "A" }, "A")).toBe(true);
  });

  it("administrador_cliente (alcance CLIENTE) no puede si el clienteId no coincide", () => {
    expect(puedeGenerarReporte({ tipo: "CLIENTE", clienteId: "A" }, "B")).toBe(false);
  });

  it("usuario_sucursal (alcance SUCURSAL) nunca puede", () => {
    expect(puedeGenerarReporte({ tipo: "SUCURSAL", sucursalIds: [] }, "cualquier-cliente")).toBe(false);
  });
});
