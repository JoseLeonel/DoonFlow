import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mocked } from "vitest";
import { AceptarCertificacionUseCase } from "../application/casos-uso/aceptar-certificacion.usecase";
import { CertificacionNoFirmadaError, CertificacionYaAceptadaError, InspeccionNoEncontradaError } from "../domain/inspeccion.errors";
import type { CertificacionRepositoryPort } from "../domain/certificacion.repository.port";

function certificacionCompleta(overrides: Partial<{ estado: string; aceptadoEn: Date | null }> = {}) {
  return {
    id: "cert1", empresaId: "e1", estado: overrides.estado ?? "FIRMADA", aceptadoEn: overrides.aceptadoEn ?? null,
    plantilla: { id: "p1", nombre: "Ficha", puntajeMaximo: 10, nodos: [], rangosResultado: [] },
    detalles: [], evidencias: [],
  } as any;
}

describe("AceptarCertificacionUseCase", () => {
  let repo: Mocked<CertificacionRepositoryPort>;
  let uc: AceptarCertificacionUseCase;

  beforeEach(() => {
    repo = {
      iniciar: vi.fn(), obtenerCompleta: vi.fn(), listar: vi.fn(), guardarRespuestasSeccion: vi.fn(),
      guardarEvidencia: vi.fn(), obtenerSucursalParaAlcance: vi.fn(), upsertDetallesConResolucionConflicto: vi.fn(),
      marcarSincronizado: vi.fn(), firmar: vi.fn(), establecerPdfUrl: vi.fn(), aceptar: vi.fn(), actualizarResultadoFinal: vi.fn(), actualizarResumenProgreso: vi.fn(),
    buscarPeriodoVigente: vi.fn(), finalizar: vi.fn(),
    };
    uc = new AceptarCertificacionUseCase(repo);
  });

  it("lanza InspeccionNoEncontradaError si la certificación no existe", async () => {
    repo.obtenerCompleta.mockResolvedValue(null);

    await expect(uc.ejecutar("cert1", "e1", "cliente1")).rejects.toThrow(InspeccionNoEncontradaError);
    expect(repo.aceptar).not.toHaveBeenCalled();
  });

  it("lanza CertificacionNoFirmadaError si estado !== FIRMADA", async () => {
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta({ estado: "EN_PROGRESO" }));

    await expect(uc.ejecutar("cert1", "e1", "cliente1")).rejects.toThrow(CertificacionNoFirmadaError);
  });

  it("lanza CertificacionYaAceptadaError si aceptadoEn ya tiene valor", async () => {
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta({ aceptadoEn: new Date() }));

    await expect(uc.ejecutar("cert1", "e1", "cliente1")).rejects.toThrow(CertificacionYaAceptadaError);
  });

  it("caso feliz: persiste aceptadoPorClienteId/aceptadoEn sin tocar estado", async () => {
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
    repo.aceptar.mockResolvedValue({ id: "cert1", estado: "FIRMADA", aceptadoPorClienteId: "cliente1", aceptadoEn: new Date() } as any);

    const resultado = await uc.ejecutar("cert1", "e1", "cliente1");

    expect(repo.aceptar).toHaveBeenCalledWith("cert1", "cliente1");
    expect(resultado.estado).toBe("FIRMADA");
  });
});
