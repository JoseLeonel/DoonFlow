import { describe, it, expect } from "vitest";
import { estaDentroDePlazo, puedeApelar, puedeResolver, yaFueResuelta } from "../domain/apelacion.entity";

describe("apelacion.entity", () => {
  describe("estaDentroDePlazo", () => {
    it("dentro del plazo (5 días de 15) → true", () => {
      expect(estaDentroDePlazo(new Date("2026-07-01T00:00:00Z"), new Date("2026-07-06T00:00:00Z"), 15)).toBe(true);
    });

    it("fuera del plazo (20 días de 15) → false", () => {
      expect(estaDentroDePlazo(new Date("2026-07-01T00:00:00Z"), new Date("2026-07-21T00:00:00Z"), 15)).toBe(false);
    });

    it("justo en el límite (día 15) → true", () => {
      expect(estaDentroDePlazo(new Date("2026-07-01T00:00:00Z"), new Date("2026-07-16T00:00:00Z"), 15)).toBe(true);
    });
  });

  describe("puedeResolver", () => {
    it("resolutorId !== firmadoPorId → true", () => {
      expect(puedeResolver("u2", "u1")).toBe(true);
    });

    it("resolutorId === firmadoPorId → false (separación de funciones)", () => {
      expect(puedeResolver("u1", "u1")).toBe(false);
    });
  });

  describe("puedeApelar", () => {
    const ahora = new Date("2026-07-10T00:00:00Z");

    it("FIRMADA, dentro de plazo, sin vencer → true", () => {
      expect(
        puedeApelar({ estado: "FIRMADA", firmadoEn: new Date("2026-07-01T00:00:00Z"), fechaVencimiento: null }, ahora, 15),
      ).toBe(true);
    });

    it("EN_PROGRESO → false", () => {
      expect(puedeApelar({ estado: "EN_PROGRESO", firmadoEn: null, fechaVencimiento: null }, ahora, 15)).toBe(false);
    });

    it("fechaVencimiento pasada → false", () => {
      expect(
        puedeApelar(
          { estado: "FIRMADA", firmadoEn: new Date("2026-07-01T00:00:00Z"), fechaVencimiento: new Date("2026-07-05T00:00:00Z") },
          ahora,
          15,
        ),
      ).toBe(false);
    });

    it("fuera de plazo → false", () => {
      expect(
        puedeApelar({ estado: "FIRMADA", firmadoEn: new Date("2026-06-01T00:00:00Z"), fechaVencimiento: null }, ahora, 15),
      ).toBe(false);
    });
  });

  describe("yaFueResuelta", () => {
    it("ABIERTA/EN_REVISION → false", () => {
      expect(yaFueResuelta({ estado: "ABIERTA" })).toBe(false);
      expect(yaFueResuelta({ estado: "EN_REVISION" })).toBe(false);
    });

    it("ACEPTADA/RECHAZADA → true", () => {
      expect(yaFueResuelta({ estado: "ACEPTADA" })).toBe(true);
      expect(yaFueResuelta({ estado: "RECHAZADA" })).toBe(true);
    });
  });
});
