import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mocked } from "vitest";
import { FinalizarCertificacionUseCase } from "../application/casos-uso/finalizar-certificacion.usecase";
import { CertificacionNoEditableError, InspeccionNoEncontradaError, SincronizacionPendienteError } from "../domain/inspeccion.errors";
import type { CertificacionCompleta, CertificacionRepositoryPort } from "../domain/certificacion.repository.port";
import type { GestionarHallazgosUseCase } from "../application/casos-uso/gestionar-hallazgos.usecase";
import type { Certificacion } from "../domain/certificacion.entity";

function certificacionCompleta(parcial: Partial<Certificacion> = {}): CertificacionCompleta {
  return {
    id: "cert1", empresaId: "e1", plantillaId: "p1", plantillaVersion: 1, inspectorId: "insp1",
    sucursalId: "s1", periodoEtiqueta: null, fechaInicioPeriodo: new Date("2026-07-01"), fechaFinPeriodo: new Date("2026-07-31"), estado: "EN_PROGRESO" as const,
    fechaInicio: new Date(), fechaFin: null, puntajeObtenido: 8, puntajeMaximo: 10,
    porcentajeCumplimiento: 80, clasificacion: "Aprobado", observaciones: null,
    capturaOffline: false, sincronizadoEn: null,
    firmadoPorId: null, firmadoEn: null, codigoVerificacion: null, pdfUrl: null,
    fechaVencimiento: null, resultadoFinal: null,
    aceptadoPorClienteId: null, aceptadoEn: null,
    creadoEn: new Date(), actualizadoEn: new Date(),
    plantilla: { id: "p1", nombre: "Ficha BPM", puntajeMaximo: 10, nodos: [], rangosResultado: [] },
    detalles: [], evidencias: [],
    ...parcial,
  };
}

function crearRepoMock(): Mocked<CertificacionRepositoryPort> {
  return {
    iniciar: vi.fn(), obtenerCompleta: vi.fn(), listar: vi.fn(), guardarRespuestasSeccion: vi.fn(),
    guardarEvidencia: vi.fn(), obtenerSucursalParaAlcance: vi.fn(), upsertDetallesConResolucionConflicto: vi.fn(),
    marcarSincronizado: vi.fn(), firmar: vi.fn(), establecerPdfUrl: vi.fn(), aceptar: vi.fn(),
    actualizarResultadoFinal: vi.fn(), actualizarResumenProgreso: vi.fn(),
    buscarPeriodoVigente: vi.fn(), finalizar: vi.fn(),
  };
}

describe("FinalizarCertificacionUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let uc: FinalizarCertificacionUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    uc = new FinalizarCertificacionUseCase(repo);
  });

  it("finaliza exitosamente: llama repo.finalizar y retorna la certificación actualizada", async () => {
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
    repo.finalizar.mockResolvedValue(certificacionCompleta({ estado: "FINALIZADA", fechaFin: new Date() }));

    const resultado = await uc.ejecutar("cert1", "e1", { pendientesSincronizacion: 0 });

    expect(repo.finalizar).toHaveBeenCalledWith("cert1");
    expect(resultado.estado).toBe("FINALIZADA");
  });

  it("lanza InspeccionNoEncontradaError si la certificación no existe", async () => {
    repo.obtenerCompleta.mockResolvedValue(null);
    await expect(uc.ejecutar("cert1", "e1", { pendientesSincronizacion: 0 })).rejects.toThrow(InspeccionNoEncontradaError);
    expect(repo.finalizar).not.toHaveBeenCalled();
  });

  it("lanza CertificacionNoEditableError si ya está FIRMADA", async () => {
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta({ estado: "FIRMADA" }));
    await expect(uc.ejecutar("cert1", "e1", { pendientesSincronizacion: 0 })).rejects.toThrow(CertificacionNoEditableError);
    expect(repo.finalizar).not.toHaveBeenCalled();
  });

  it("lanza CertificacionNoEditableError si ya está FINALIZADA (no se puede finalizar dos veces)", async () => {
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta({ estado: "FINALIZADA" }));
    await expect(uc.ejecutar("cert1", "e1", { pendientesSincronizacion: 0 })).rejects.toThrow(CertificacionNoEditableError);
  });

  it("lanza SincronizacionPendienteError si hay respuestas/evidencias sin sincronizar", async () => {
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
    await expect(uc.ejecutar("cert1", "e1", { pendientesSincronizacion: 2 })).rejects.toThrow(SincronizacionPendienteError);
    expect(repo.finalizar).not.toHaveBeenCalled();
  });

  it("cuando se inyecta gestionarHallazgos, genera los hallazgos automáticos antes de finalizar", async () => {
    const gestionarHallazgos = { generarAutomaticos: vi.fn().mockResolvedValue([]) } as unknown as Mocked<GestionarHallazgosUseCase>;
    uc = new FinalizarCertificacionUseCase(repo, gestionarHallazgos);
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
    repo.finalizar.mockResolvedValue(certificacionCompleta({ estado: "FINALIZADA" }));

    await uc.ejecutar("cert1", "e1", { pendientesSincronizacion: 0 });

    expect(gestionarHallazgos.generarAutomaticos).toHaveBeenCalledWith("cert1", "e1", undefined);
  });

  it("NO exige ausencia de hallazgo crítico (a diferencia de firmar) — finalizar es un cierre liviano", async () => {
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
    repo.finalizar.mockResolvedValue(certificacionCompleta({ estado: "FINALIZADA" }));

    await expect(uc.ejecutar("cert1", "e1", { pendientesSincronizacion: 0 })).resolves.toBeDefined();
  });
});
