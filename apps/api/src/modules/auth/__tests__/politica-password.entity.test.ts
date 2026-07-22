import { describe, it, expect } from "vitest";
import { validarPoliticaPassword } from "../domain/politica-password.entity";

describe("validarPoliticaPassword", () => {
  it("retorna null con una contraseña válida (8+ caracteres, mayúscula, número)", () => {
    expect(validarPoliticaPassword("Abcd1234")).toBeNull();
  });

  it("retorna mensaje de error con menos de 8 caracteres", () => {
    expect(validarPoliticaPassword("Ab1")).toMatch(/8 caracteres/);
  });

  it("retorna mensaje de error sin mayúscula", () => {
    expect(validarPoliticaPassword("abcd1234")).toMatch(/mayúscula/);
  });

  it("retorna mensaje de error sin número", () => {
    expect(validarPoliticaPassword("Abcdefgh")).toMatch(/número/);
  });
});
