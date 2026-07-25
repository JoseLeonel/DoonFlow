import { describe, it, expect } from "vitest";
import { puedeReprogramarse, vincularInspeccion } from "../domain/plan-auditoria.entity";

describe("puedeReprogramarse", () => {
  it("PROGRAMADA → true", () => {
    expect(puedeReprogramarse({ estado: "PROGRAMADA" })).toBe(true);
  });
  it("REPROGRAMADA → true", () => {
    expect(puedeReprogramarse({ estado: "REPROGRAMADA" })).toBe(true);
  });
  it("EJECUTADA → false", () => {
    expect(puedeReprogramarse({ estado: "EJECUTADA" })).toBe(false);
  });
});

describe("vincularInspeccion", () => {
  it("retorna una copia con estado EJECUTADA e inspeccionId asignado", () => {
    const plan = { estado: "PROGRAMADA" as const, inspeccionId: null };
    const resultado = vincularInspeccion(plan, "insp1");
    expect(resultado).toEqual({ estado: "EJECUTADA", inspeccionId: "insp1" });
    expect(plan.estado).toBe("PROGRAMADA");
  });
});
