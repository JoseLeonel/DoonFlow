import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mocked } from "vitest";
import { ResolverApelacionUseCase } from "../application/casos-uso/resolver-apelacion.usecase";
import {
  ApelacionNoEncontradaError,
  ApelacionSeparacionFuncionesError,
  ApelacionYaResueltaError,
} from "../domain/apelacion.errors";
import type { ApelacionConDetalle, ApelacionRepositoryPort } from "../domain/apelacion.repository.port";
import type { PuertoCertificacionParaApelaciones } from "../domain/puerto-certificacion.port";

function apelacionAbierta(overrides: Partial<{ tipo: "SOBRE_HALLAZGO" | "SOBRE_RESULTADO"; hallazgoId: string | null; estado: ApelacionConDetalle["estado"] }> = {}): ApelacionConDetalle {
  return {
    id: "a1", empresaId: "e1", inspeccionId: "cert1",
    hallazgoId: overrides.hallazgoId ?? "h1",
    tipo: overrides.tipo ?? "SOBRE_HALLAZGO",
    motivo: "Motivo", solicitadoPorId: "cliente1", solicitadoEn: new Date(),
    estado: overrides.estado ?? "ABIERTA",
    resueltoPorId: null, resueltoEn: null, resolucionComentario: null,
    solicitadoPorNombre: "Cliente Demo", inspeccionEtiqueta: "Julio 2026",
  };
}

describe("ResolverApelacionUseCase", () => {
  let repo: Mocked<ApelacionRepositoryPort>;
  let puerto: Mocked<PuertoCertificacionParaApelaciones>;
  let uc: ResolverApelacionUseCase;

  beforeEach(() => {
    repo = { crear: vi.fn(), obtenerPorId: vi.fn(), listarAbiertas: vi.fn(), listarPorInspeccion: vi.fn(), resolver: vi.fn() };
    puerto = {
      obtenerCertificacion: vi.fn(),
      obtenerHallazgo: vi.fn(),
      anularHallazgoPorApelacion: vi.fn(),
      recalcularResultadoFinal: vi.fn(),
    };
    uc = new ResolverApelacionUseCase(repo, puerto);
  });

  it("lanza ApelacionNoEncontradaError si el repo retorna null", async () => {
    repo.obtenerPorId.mockResolvedValue(null);

    await expect(
      uc.ejecutar("a1", "e1", "auditor2", { estado: "ACEPTADA", resolucionComentario: "Justificación válida" }),
    ).rejects.toThrow(ApelacionNoEncontradaError);
  });

  it("lanza ApelacionYaResueltaError si ya estaba ACEPTADA/RECHAZADA", async () => {
    repo.obtenerPorId.mockResolvedValue(apelacionAbierta({ estado: "ACEPTADA" }));

    await expect(
      uc.ejecutar("a1", "e1", "auditor2", { estado: "RECHAZADA", resolucionComentario: "Justificación válida" }),
    ).rejects.toThrow(ApelacionYaResueltaError);
  });

  it("lanza ApelacionSeparacionFuncionesError si resolutorId === firmadoPorId", async () => {
    repo.obtenerPorId.mockResolvedValue(apelacionAbierta());
    puerto.obtenerCertificacion.mockResolvedValue({ id: "cert1", estado: "FIRMADA", firmadoEn: new Date(), firmadoPorId: "auditor1", fechaVencimiento: null });

    await expect(
      uc.ejecutar("a1", "e1", "auditor1", { estado: "ACEPTADA", resolucionComentario: "Justificación válida" }),
    ).rejects.toThrow(ApelacionSeparacionFuncionesError);
    expect(repo.resolver).not.toHaveBeenCalled();
  });

  it("ACEPTADA + SOBRE_HALLAZGO → llama anularHallazgoPorApelacion() y recalcularResultadoFinal()", async () => {
    repo.obtenerPorId.mockResolvedValue(apelacionAbierta());
    puerto.obtenerCertificacion.mockResolvedValue({ id: "cert1", estado: "FIRMADA", firmadoEn: new Date(), firmadoPorId: "auditor1", fechaVencimiento: null });
    repo.resolver.mockResolvedValue({ ...apelacionAbierta(), estado: "ACEPTADA" });

    await uc.ejecutar("a1", "e1", "auditor2", { estado: "ACEPTADA", resolucionComentario: "Justificación válida" });

    expect(puerto.anularHallazgoPorApelacion).toHaveBeenCalledWith("h1", "e1");
    expect(puerto.recalcularResultadoFinal).toHaveBeenCalledWith("cert1", "e1");
  });

  it("ACEPTADA + SOBRE_RESULTADO → NO llama anularHallazgoPorApelacion()", async () => {
    repo.obtenerPorId.mockResolvedValue(apelacionAbierta({ tipo: "SOBRE_RESULTADO", hallazgoId: null }));
    puerto.obtenerCertificacion.mockResolvedValue({ id: "cert1", estado: "FIRMADA", firmadoEn: new Date(), firmadoPorId: "auditor1", fechaVencimiento: null });
    repo.resolver.mockResolvedValue({ ...apelacionAbierta(), tipo: "SOBRE_RESULTADO", estado: "ACEPTADA" });

    await uc.ejecutar("a1", "e1", "auditor2", { estado: "ACEPTADA", resolucionComentario: "Justificación válida" });

    expect(puerto.anularHallazgoPorApelacion).not.toHaveBeenCalled();
    expect(puerto.recalcularResultadoFinal).not.toHaveBeenCalled();
  });

  it("RECHAZADA → no toca el hallazgo, solo persiste resueltoPorId/resueltoEn/resolucionComentario", async () => {
    repo.obtenerPorId.mockResolvedValue(apelacionAbierta());
    puerto.obtenerCertificacion.mockResolvedValue({ id: "cert1", estado: "FIRMADA", firmadoEn: new Date(), firmadoPorId: "auditor1", fechaVencimiento: null });
    repo.resolver.mockResolvedValue({ ...apelacionAbierta(), estado: "RECHAZADA" });

    await uc.ejecutar("a1", "e1", "auditor2", { estado: "RECHAZADA", resolucionComentario: "No procede" });

    expect(repo.resolver).toHaveBeenCalledWith("a1", "e1", {
      estado: "RECHAZADA", resueltoPorId: "auditor2", resolucionComentario: "No procede",
    });
    expect(puerto.anularHallazgoPorApelacion).not.toHaveBeenCalled();
  });
});
