import { describe, it, expect } from "vitest";
import { esRolAdministrador, puedeEditarseDesdeMatriz } from "../domain/rol-permiso.entity";

describe("esRolAdministrador", () => {
  it("retorna true cuando rol.nombre es administrador", () => {
    expect(esRolAdministrador({ nombre: "administrador" })).toBe(true);
  });
  it("retorna false para cualquier otro nombre de rol", () => {
    expect(esRolAdministrador({ nombre: "auditor" })).toBe(false);
    expect(esRolAdministrador({ nombre: "usuario_sucursal" })).toBe(false);
  });
});

describe("puedeEditarseDesdeMatriz", () => {
  it("es la negación exacta de esRolAdministrador", () => {
    expect(puedeEditarseDesdeMatriz({ nombre: "administrador" })).toBe(false);
    expect(puedeEditarseDesdeMatriz({ nombre: "auditor" })).toBe(true);
  });
});
