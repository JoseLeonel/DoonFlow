import { describe, it, expect } from "vitest";
import { puedeSeleccionarse, validarCorreo } from "../domain/sucursal.entity";
import type { Sucursal } from "../domain/sucursal.entity";

function sucursal(parcial: Partial<Sucursal> = {}): Sucursal {
  return {
    id: "s1",
    empresaId: "e1",
    clienteId: "c1",
    nombre: "Planta Central",
    activo: true,
    creadoEn: new Date("2026-01-01"),
    actualizadoEn: new Date("2026-01-01"),
    ...parcial,
  };
}

describe("puedeSeleccionarse", () => {
  it("retorna true con sucursal activa", () => {
    expect(puedeSeleccionarse(sucursal({ activo: true }))).toBe(true);
  });

  it("retorna false con sucursal inactiva", () => {
    expect(puedeSeleccionarse(sucursal({ activo: false }))).toBe(false);
  });
});

describe("validarCorreo", () => {
  it("retorna true con un correo válido", () => {
    expect(validarCorreo("contacto@sucursal.com")).toBe(true);
  });

  it("retorna false con un correo inválido", () => {
    expect(validarCorreo("no-es-correo")).toBe(false);
  });

  it("retorna false con cadena vacía", () => {
    expect(validarCorreo("")).toBe(false);
  });
});
