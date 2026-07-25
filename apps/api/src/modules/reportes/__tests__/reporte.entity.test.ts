import { describe, it, expect } from "vitest";
import { calcularPctSucursalesVigentes, construirAtencionRequerida, construirResumenFiltros, puedeGenerarReporte } from "../domain/reporte.entity";

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

// ── Panel ejecutivo (014-panel-calendario-biblioteca) ──────────────────────

describe("calcularPctSucursalesVigentes", () => {
  it("3 de 4 sucursales vigentes → 75", () => {
    expect(calcularPctSucursalesVigentes(3, 4)).toBe(75);
  });

  it("sin sucursales en alcance → 0 (evita división por cero)", () => {
    expect(calcularPctSucursalesVigentes(0, 0)).toBe(0);
  });

  it("redondea a 1 decimal", () => {
    expect(calcularPctSucursalesVigentes(1, 3)).toBe(33.3);
  });
});

describe("construirAtencionRequerida", () => {
  const ahora = new Date("2026-07-23T00:00:00Z");

  it("combina certificaciones por vencer y acciones vencidas ordenadas por urgencia", () => {
    const resultado = construirAtencionRequerida({
      certificacionesPorVencer: [
        { sucursal: "Sucursal Cartago", cliente: "Distribuidora Sur", fechaVencimiento: new Date("2026-08-08T00:00:00Z") },
      ],
      accionesVencidas: [
        { descripcion: "Sustituir extintor", sucursal: "Sucursal Heredia", cliente: "Agro Norte", fechaLimite: new Date("2026-07-20T00:00:00Z") },
      ],
    }, ahora);

    expect(resultado).toHaveLength(2);
    expect(resultado[0]!.tipo).toBe("accion_vencida");
    expect(resultado[0]!.diasVencida).toBe(3);
    expect(resultado[1]!.tipo).toBe("certificacion_por_vencer");
    expect(resultado[1]!.diasRestantes).toBe(16);
  });

  it("sin datos retorna lista vacía", () => {
    expect(construirAtencionRequerida({ certificacionesPorVencer: [], accionesVencidas: [] }, ahora)).toEqual([]);
  });
});
