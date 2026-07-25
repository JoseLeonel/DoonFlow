import { describe, it, expect } from "vitest";
import { construirMensaje, debeEscalar } from "../domain/notificacion.entity";

describe("debeEscalar", () => {
  const ahora = new Date("2026-07-23T00:00:00Z");

  it("VENCIDO con fechaLimite hace 8 días → true", () => {
    expect(debeEscalar({ estado: "VENCIDO", fechaLimite: new Date("2026-07-15T00:00:00Z") }, 7, ahora)).toBe(true);
  });

  it("VENCIDO con fechaLimite hace 3 días → false", () => {
    expect(debeEscalar({ estado: "VENCIDO", fechaLimite: new Date("2026-07-20T00:00:00Z") }, 7, ahora)).toBe(false);
  });

  it("CUMPLIDO con fechaLimite vencida hace 30 días → false", () => {
    expect(debeEscalar({ estado: "CUMPLIDO", fechaLimite: new Date("2026-06-23T00:00:00Z") }, 7, ahora)).toBe(false);
  });
});

describe("construirMensaje", () => {
  it("CERTIFICACION_POR_VENCER produce el texto esperado con sucursal y días interpolados", () => {
    expect(construirMensaje("CERTIFICACION_POR_VENCER", { sucursal: "Planta Central", diasRestantes: 15 }))
      .toBe("La certificación de Planta Central vence en 15 día(s).");
  });

  it("ACCION_ESCALADA produce el texto esperado", () => {
    expect(construirMensaje("ACCION_ESCALADA", { descripcionAccion: "Sustituir extintor" }))
      .toBe('La acción "Sustituir extintor" sigue vencida sin actualizarse y fue escalada.');
  });

  it("ACCION_ASIGNADA produce el texto esperado", () => {
    expect(construirMensaje("ACCION_ASIGNADA", { descripcionAccion: "Sustituir extintor" }))
      .toBe('Se te asignó la acción correctiva "Sustituir extintor".');
  });

  it("HALLAZGO_CRITICO produce el texto esperado con periodo", () => {
    expect(construirMensaje("HALLAZGO_CRITICO", { sucursal: "Planta Central", periodoEtiqueta: "Julio 2026" }))
      .toBe("Se registró un hallazgo crítico en Planta Central (Julio 2026).");
  });
});
