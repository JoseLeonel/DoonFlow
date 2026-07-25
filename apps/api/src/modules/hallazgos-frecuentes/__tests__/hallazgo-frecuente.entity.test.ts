import { describe, it, expect } from "vitest";
import { puedeSeleccionarse } from "../domain/hallazgo-frecuente.entity";

describe("puedeSeleccionarse", () => {
  it("activo → true", () => {
    expect(puedeSeleccionarse({ activo: true })).toBe(true);
  });
  it("inactivo → false", () => {
    expect(puedeSeleccionarse({ activo: false })).toBe(false);
  });
});
