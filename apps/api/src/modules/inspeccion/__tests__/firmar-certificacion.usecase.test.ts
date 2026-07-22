import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { FirmarCertificacionUseCase } from "../application/casos-uso/firmar-certificacion.usecase";
import {
  CertificacionConHallazgoCriticoError,
  CertificacionNoEditableError,
  InspeccionNoEncontradaError,
  SincronizacionPendienteError,
} from "../domain/inspeccion.errors";
import type { CertificacionRepositoryPort } from "../domain/certificacion.repository.port";
import type { GeneradorPdfCertificacionPort } from "../domain/generador-pdf-certificacion.port";
import type { AlmacenamientoEvidenciasPort } from "../domain/almacenamiento-evidencias.port";
import type { HallazgoRepositoryPort } from "../domain/hallazgo.repository.port";
import type { Certificacion } from "../domain/certificacion.entity";

function certificacionCompleta(parcial: Partial<Certificacion> = {}) {
  return {
    id: "cert1", empresaId: "e1", plantillaId: "p1", plantillaVersion: 1, inspectorId: "insp1",
    sucursalId: "s1", periodoEtiqueta: "Julio 2026", estado: "EN_PROGRESO" as const,
    fechaInicio: new Date(), fechaFin: null, puntajeObtenido: 8, puntajeMaximo: 10,
    porcentajeCumplimiento: 80, clasificacion: "Aprobado", observaciones: null,
    capturaOffline: false, sincronizadoEn: null,
    firmadoPorId: null, firmadoEn: null, codigoVerificacion: null, pdfUrl: null,
    fechaVencimiento: null, resultadoFinal: null,
    creadoEn: new Date(), actualizadoEn: new Date(),
    plantilla: { id: "p1", nombre: "Ficha BPM", puntajeMaximo: 10, nodos: [], rangosResultado: [] },
    detalles: [], evidencias: [],
    ...parcial,
  };
}

function crearRepoMock(): CertificacionRepositoryPort & Record<string, Mock> {
  return {
    obtenerCompleta: vi.fn(),
    firmar: vi.fn(),
    establecerPdfUrl: vi.fn(),
  } as unknown as CertificacionRepositoryPort & Record<string, Mock>;
}

describe("FirmarCertificacionUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let generadorPdf: GeneradorPdfCertificacionPort & Record<string, Mock>;
  let almacenamientoPdf: AlmacenamientoEvidenciasPort & Record<string, Mock>;
  let uc: FirmarCertificacionUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    generadorPdf = { generar: vi.fn().mockResolvedValue(Buffer.from("pdf")) } as unknown as GeneradorPdfCertificacionPort & Record<string, Mock>;
    almacenamientoPdf = { subirArchivo: vi.fn().mockResolvedValue("http://localhost:4000/archivos/certificaciones-pdf/e1/cert1/certificado.pdf") } as unknown as AlmacenamientoEvidenciasPort & Record<string, Mock>;
    uc = new FirmarCertificacionUseCase(repo, generadorPdf, almacenamientoPdf);
  });

  it("firma exitosamente: llama al repo, genera el PDF y persiste la URL", async () => {
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
    repo.firmar.mockResolvedValue(certificacionCompleta({
      estado: "FIRMADA", codigoVerificacion: "ABC1234567", firmadoEn: new Date("2026-07-21"),
      fechaVencimiento: new Date("2027-07-21"), resultadoFinal: "APROBADA",
    }));
    repo.establecerPdfUrl.mockResolvedValue(certificacionCompleta({
      estado: "FIRMADA", codigoVerificacion: "ABC1234567", pdfUrl: "http://x/certificado.pdf",
    }));

    const resultado = await uc.ejecutar("cert1", "e1", "u1", { pendientesSincronizacion: 0 });

    expect(repo.firmar).toHaveBeenCalledWith("cert1", "u1", expect.any(String));
    expect(generadorPdf.generar).toHaveBeenCalledTimes(1);
    expect(almacenamientoPdf.subirArchivo).toHaveBeenCalledWith("e1/cert1/certificado.pdf", expect.any(Buffer), "application/pdf");
    expect(repo.establecerPdfUrl).toHaveBeenCalledWith("cert1", expect.any(String));
    expect(resultado.pdfUrl).toBe("http://x/certificado.pdf");
  });

  it("lanza InspeccionNoEncontradaError si la certificación no existe", async () => {
    repo.obtenerCompleta.mockResolvedValue(null);
    await expect(uc.ejecutar("cert1", "e1", "u1", { pendientesSincronizacion: 0 })).rejects.toThrow(InspeccionNoEncontradaError);
    expect(repo.firmar).not.toHaveBeenCalled();
  });

  it("lanza CertificacionNoEditableError si ya está FIRMADA", async () => {
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta({ estado: "FIRMADA" }));
    await expect(uc.ejecutar("cert1", "e1", "u1", { pendientesSincronizacion: 0 })).rejects.toThrow(CertificacionNoEditableError);
    expect(repo.firmar).not.toHaveBeenCalled();
  });

  it("lanza SincronizacionPendienteError si hay respuestas/evidencias sin sincronizar", async () => {
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
    await expect(uc.ejecutar("cert1", "e1", "u1", { pendientesSincronizacion: 2 })).rejects.toThrow(SincronizacionPendienteError);
    expect(repo.firmar).not.toHaveBeenCalled();
  });

  it("reintenta con un código nuevo si el primero colisiona (unique constraint)", async () => {
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
    repo.firmar
      .mockRejectedValueOnce(new Error('duplicate key value violates unique constraint "inspeccion_codigo_verificacion_key"'))
      .mockResolvedValueOnce(certificacionCompleta({ estado: "FIRMADA", codigoVerificacion: "XYZ9876543", firmadoEn: new Date(), fechaVencimiento: new Date(), resultadoFinal: "APROBADA" }));
    repo.establecerPdfUrl.mockResolvedValue(certificacionCompleta({ estado: "FIRMADA", pdfUrl: "http://x/certificado.pdf" }));

    const resultado = await uc.ejecutar("cert1", "e1", "u1", { pendientesSincronizacion: 0 });

    expect(repo.firmar).toHaveBeenCalledTimes(2);
    expect(resultado.pdfUrl).toBe("http://x/certificado.pdf");
  });

  it("propaga errores que no son colisión de código sin reintentar", async () => {
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
    repo.firmar.mockRejectedValue(new Error("certificacion_no_editable"));

    await expect(uc.ejecutar("cert1", "e1", "u1", { pendientesSincronizacion: 0 })).rejects.toThrow("certificacion_no_editable");
    expect(repo.firmar).toHaveBeenCalledTimes(1);
  });

  // ── 013-hallazgos-plan-cumplimiento ──────────────────────────────────────

  it("con hallazgo crítico pendiente, sp_inspeccion_firmar rechaza y se traduce a CertificacionConHallazgoCriticoError", async () => {
    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
    repo.firmar.mockRejectedValue(new Error("hallazgo_critico_pendiente"));

    await expect(uc.ejecutar("cert1", "e1", "u1", { pendientesSincronizacion: 0 })).rejects.toThrow(
      CertificacionConHallazgoCriticoError,
    );
    expect(repo.firmar).toHaveBeenCalledTimes(1);
  });

  it("con hallazgos MAYOR/MENOR únicamente retorna resultadoFinal APROBADA_CON_OBSERVACIONES e incluye los hallazgos en el PDF", async () => {
    const hallazgoRepo = {
      listarPorInspeccion: vi.fn().mockResolvedValue([{ descripcion: "Falta señalización", severidad: "MAYOR" }]),
    } as unknown as HallazgoRepositoryPort & Record<string, Mock>;
    uc = new FirmarCertificacionUseCase(repo, generadorPdf, almacenamientoPdf, hallazgoRepo);

    repo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
    repo.firmar.mockResolvedValue(certificacionCompleta({
      estado: "FIRMADA", codigoVerificacion: "ABC1234567", firmadoEn: new Date(),
      fechaVencimiento: new Date(), resultadoFinal: "APROBADA_CON_OBSERVACIONES",
    }));
    repo.establecerPdfUrl.mockResolvedValue(certificacionCompleta({
      estado: "FIRMADA", resultadoFinal: "APROBADA_CON_OBSERVACIONES", pdfUrl: "http://x/certificado.pdf",
    }));

    const resultado = await uc.ejecutar("cert1", "e1", "u1", { pendientesSincronizacion: 0 });

    expect(resultado.resultadoFinal).toBe("APROBADA_CON_OBSERVACIONES");
    expect(generadorPdf.generar).toHaveBeenCalledWith(
      expect.objectContaining({ hallazgos: [{ descripcion: "Falta señalización", severidad: "MAYOR" }] }),
    );
  });
});
