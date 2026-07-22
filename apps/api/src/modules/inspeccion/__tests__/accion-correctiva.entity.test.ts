import { describe, it, expect } from "vitest";
import {
  calcularEstadoEfectivo,
  puedeActualizarAvance,
  puedeVerificar,
  transicionarPorVerificacion,
} from "../domain/accion-correctiva.entity";

const ahora = new Date("2026-07-22T00:00:00Z");
const fechaPasada = new Date("2020-01-01");
const fechaFutura = new Date("2030-01-01");

describe("calcularEstadoEfectivo", () => {
  it("con fechaLimite pasada y estado PENDIENTE retorna VENCIDO", () => {
    expect(calcularEstadoEfectivo({ fechaLimite: fechaPasada, estado: "PENDIENTE" }, ahora)).toBe("VENCIDO");
  });

  it("con fechaLimite pasada y estado EN_PROCESO retorna VENCIDO", () => {
    expect(calcularEstadoEfectivo({ fechaLimite: fechaPasada, estado: "EN_PROCESO" }, ahora)).toBe("VENCIDO");
  });

  it("con fechaLimite pasada pero estado CUMPLIDO no cambia", () => {
    expect(calcularEstadoEfectivo({ fechaLimite: fechaPasada, estado: "CUMPLIDO" }, ahora)).toBe("CUMPLIDO");
  });

  it("con fechaLimite pasada pero estado NO_CUMPLIDO no cambia", () => {
    expect(calcularEstadoEfectivo({ fechaLimite: fechaPasada, estado: "NO_CUMPLIDO" }, ahora)).toBe("NO_CUMPLIDO");
  });

  it("con fechaLimite futura no cambia", () => {
    expect(calcularEstadoEfectivo({ fechaLimite: fechaFutura, estado: "PENDIENTE" }, ahora)).toBe("PENDIENTE");
  });
});

describe("puedeActualizarAvance", () => {
  it("el propio responsable puede actualizar su avance", () => {
    expect(puedeActualizarAvance({ responsableId: "u1" }, "u1", false)).toBe(true);
  });

  it("otro usuario de sucursal, sin alcance administrativo, no puede", () => {
    expect(puedeActualizarAvance({ responsableId: "u1" }, "u2", false)).toBe(false);
  });

  it("un administrador con alcance sobre la sucursal sí puede, aunque no sea el responsable", () => {
    expect(puedeActualizarAvance({ responsableId: "u1" }, "u2", true)).toBe(true);
  });
});

describe("puedeVerificar", () => {
  it("un auditor puede verificar", () => {
    expect(puedeVerificar({ rol: "auditor" })).toBe(true);
  });

  it("un administrador puede verificar", () => {
    expect(puedeVerificar({ rol: "administrador" })).toBe(true);
  });

  it("un usuario_sucursal no puede verificar", () => {
    expect(puedeVerificar({ rol: "usuario_sucursal" })).toBe(false);
  });
});

describe("transicionarPorVerificacion", () => {
  it('"CUMPLIDO" transiciona a CUMPLIDO', () => {
    expect(transicionarPorVerificacion("CUMPLIDO")).toBe("CUMPLIDO");
  });

  it('"NO_CUMPLIDO" transiciona a EN_PROCESO (permite retomar la acción)', () => {
    expect(transicionarPorVerificacion("NO_CUMPLIDO")).toBe("EN_PROCESO");
  });
});
