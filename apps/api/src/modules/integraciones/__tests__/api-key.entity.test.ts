import { describe, it, expect } from "vitest";
import { generarClave, hashClave, estaActiva } from "../domain/api-key.entity";

describe("generarClave", () => {
  it("genera una clave con el prefijo dnf_live_ y suficiente entropía", () => {
    const clave = generarClave();
    expect(clave.startsWith("dnf_live_")).toBe(true);
    expect(clave.length).toBeGreaterThan(60);
  });

  it("genera claves distintas en cada llamada", () => {
    expect(generarClave()).not.toBe(generarClave());
  });
});

describe("hashClave", () => {
  it("el mismo texto plano siempre produce el mismo hash (determinístico)", () => {
    const clave = generarClave();
    expect(hashClave(clave)).toBe(hashClave(clave));
  });

  it("claves distintas producen hashes distintos", () => {
    expect(hashClave(generarClave())).not.toBe(hashClave(generarClave()));
  });

  it("el hash es un hex de 64 caracteres (SHA-256)", () => {
    expect(hashClave("cualquier-texto")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("estaActiva", () => {
  it("activa: true → true", () => {
    expect(estaActiva({ activa: true })).toBe(true);
  });
  it("activa: false → false", () => {
    expect(estaActiva({ activa: false })).toBe(false);
  });
});
