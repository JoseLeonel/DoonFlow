import { describe, it, expect, vi } from "vitest";
import { VerificarCertificadoUseCase } from "../application/casos-uso/verificar-certificado.usecase";

function certificado(overrides: Partial<{ fechaVencimiento: Date }> = {}) {
  return {
    cliente: "Distribuidora Sur S.A.",
    sucursal: "Sucursal Cartago",
    fechaEmision: new Date("2026-01-15"),
    fechaVencimiento: overrides.fechaVencimiento ?? new Date("2027-01-15"),
    nombrePlantilla: "Inspección Ministerio de Salud 2026",
  };
}

describe("VerificarCertificadoUseCase", () => {
  it("código existente con fechaVencimiento futura → estado VIGENTE", async () => {
    const repo = { obtenerPorCodigo: vi.fn().mockResolvedValue(certificado()) };
    const uc = new VerificarCertificadoUseCase(repo);

    const resultado = await uc.ejecutar("ABC123", new Date("2026-07-23"));

    expect(resultado?.estado).toBe("VIGENTE");
  });

  it("código existente con fechaVencimiento pasada → estado VENCIDA", async () => {
    const repo = { obtenerPorCodigo: vi.fn().mockResolvedValue(certificado({ fechaVencimiento: new Date("2026-01-01") })) };
    const uc = new VerificarCertificadoUseCase(repo);

    const resultado = await uc.ejecutar("ABC123", new Date("2026-07-23"));

    expect(resultado?.estado).toBe("VENCIDA");
  });

  it("código inexistente → null", async () => {
    const repo = { obtenerPorCodigo: vi.fn().mockResolvedValue(null) };
    const uc = new VerificarCertificadoUseCase(repo);

    await expect(uc.ejecutar("NOEXISTE")).resolves.toBeNull();
  });

  it("el resultado nunca incluye claves hallazgos, respuestas ni evidencias", async () => {
    const repo = { obtenerPorCodigo: vi.fn().mockResolvedValue(certificado()) };
    const uc = new VerificarCertificadoUseCase(repo);

    const resultado = await uc.ejecutar("ABC123");

    expect(resultado).not.toHaveProperty("hallazgos");
    expect(resultado).not.toHaveProperty("respuestas");
    expect(resultado).not.toHaveProperty("evidencias");
  });
});
