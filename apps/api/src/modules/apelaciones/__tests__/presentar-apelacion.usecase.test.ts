import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mocked } from "vitest";
import { PresentarApelacionUseCase } from "../application/casos-uso/presentar-apelacion.usecase";
import {
  CertificacionNoFirmadaError,
  CertificacionVencidaError,
  PlazoApelacionVencidoError,
} from "../domain/apelacion.errors";
import type { ApelacionRepositoryPort } from "../domain/apelacion.repository.port";
import type { PuertoCertificacionParaApelaciones } from "../domain/puerto-certificacion.port";

function certificacionFirmada(overrides: Partial<{ firmadoEn: Date; fechaVencimiento: Date | null }> = {}) {
  return {
    id: "cert1",
    estado: "FIRMADA",
    firmadoEn: overrides.firmadoEn ?? new Date("2026-07-01T00:00:00Z"),
    firmadoPorId: "auditor1",
    fechaVencimiento: overrides.fechaVencimiento ?? null,
  };
}

describe("PresentarApelacionUseCase", () => {
  let repo: Mocked<ApelacionRepositoryPort>;
  let puerto: Mocked<PuertoCertificacionParaApelaciones>;
  let uc: PresentarApelacionUseCase;

  beforeEach(() => {
    repo = { crear: vi.fn(), obtenerPorId: vi.fn(), listarAbiertas: vi.fn(), listarPorInspeccion: vi.fn(), resolver: vi.fn() };
    puerto = {
      obtenerCertificacion: vi.fn(),
      obtenerHallazgo: vi.fn(),
      anularHallazgoPorApelacion: vi.fn(),
      recalcularResultadoFinal: vi.fn(),
    };
    uc = new PresentarApelacionUseCase(repo, puerto);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lanza CertificacionNoFirmadaError si la inspección no está FIRMADA", async () => {
    puerto.obtenerCertificacion.mockResolvedValue({ id: "cert1", estado: "EN_PROGRESO", firmadoEn: null, firmadoPorId: null, fechaVencimiento: null });

    await expect(
      uc.ejecutar("e1", "cliente1", { inspeccionId: "cert1", tipo: "SOBRE_RESULTADO", motivo: "Motivo con más de 10 caracteres" }),
    ).rejects.toThrow(CertificacionNoFirmadaError);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("lanza PlazoApelacionVencidoError si firmadoEn supera PLAZO_APELACION_DIAS", async () => {
    puerto.obtenerCertificacion.mockResolvedValue(certificacionFirmada({ firmadoEn: new Date("2026-06-01T00:00:00Z") }));

    await expect(
      uc.ejecutar("e1", "cliente1", { inspeccionId: "cert1", tipo: "SOBRE_RESULTADO", motivo: "Motivo con más de 10 caracteres" }),
    ).rejects.toThrow(PlazoApelacionVencidoError);
  });

  it("lanza CertificacionVencidaError si fechaVencimiento ya pasó", async () => {
    puerto.obtenerCertificacion.mockResolvedValue(certificacionFirmada({ fechaVencimiento: new Date("2026-07-04T00:00:00Z") }));

    await expect(
      uc.ejecutar("e1", "cliente1", { inspeccionId: "cert1", tipo: "SOBRE_RESULTADO", motivo: "Motivo con más de 10 caracteres" }),
    ).rejects.toThrow(CertificacionVencidaError);
  });

  it("con tipo SOBRE_HALLAZGO y hallazgoId válido → llama repo.crear() con estado ABIERTA", async () => {
    puerto.obtenerCertificacion.mockResolvedValue(certificacionFirmada());
    puerto.obtenerHallazgo.mockResolvedValue({ id: "h1", inspeccionId: "cert1", estado: "ACTIVO" });
    repo.crear.mockResolvedValue({ id: "a1", estado: "ABIERTA" } as any);

    await uc.ejecutar("e1", "cliente1", { inspeccionId: "cert1", tipo: "SOBRE_HALLAZGO", hallazgoId: "h1", motivo: "Motivo con más de 10 caracteres" });

    expect(repo.crear).toHaveBeenCalledWith({
      empresaId: "e1", inspeccionId: "cert1", hallazgoId: "h1", tipo: "SOBRE_HALLAZGO",
      motivo: "Motivo con más de 10 caracteres", solicitadoPorId: "cliente1",
    });
  });

  it("con tipo SOBRE_RESULTADO → hallazgoId queda null en los datos persistidos", async () => {
    puerto.obtenerCertificacion.mockResolvedValue(certificacionFirmada());
    repo.crear.mockResolvedValue({ id: "a1", estado: "ABIERTA" } as any);

    await uc.ejecutar("e1", "cliente1", { inspeccionId: "cert1", tipo: "SOBRE_RESULTADO", motivo: "Motivo con más de 10 caracteres" });

    expect(repo.crear).toHaveBeenCalledWith(expect.objectContaining({ hallazgoId: null }));
    expect(puerto.obtenerHallazgo).not.toHaveBeenCalled();
  });
});
