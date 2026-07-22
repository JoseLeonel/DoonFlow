import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { SincronizarCapturaOfflineUseCase, LIMITE_LOTE_SINCRONIZACION } from "../application/casos-uso/sincronizar-captura-offline.usecase";
import { ResponderCertificacionUseCase } from "../application/casos-uso/responder-certificacion.usecase";
import { LoteSincronizacionExcedeLimiteError, RespuestaNoSincronizadaError } from "../domain/inspeccion.errors";
import type { AlmacenamientoEvidenciasPort } from "../domain/almacenamiento-evidencias.port";
import type { CertificacionRepositoryPort, CertificacionCompleta, DetalleGuardado } from "../domain/certificacion.repository.port";
import type { NodoArbol } from "../domain/plantilla.entity";
import type { SincronizarLoteInput } from "../application/certificacion.schema";

function nodoPregunta(id: string, parcial: Partial<NodoArbol> = {}): NodoArbol {
  return {
    id, padreId: "s1", tipo: "PREGUNTA", codigo: id, titulo: `Pregunta ${id}`,
    orden: 0, nivel: 1, activo: true, tipoRespuesta: "SI_NO", puntajeMaximo: 10,
    reglaComentario: "NUNCA", evidenciaObligatoria: false, evidenciaMinima: 0,
    evidenciaMaxima: 0, opciones: [], hijos: [], ...parcial,
  };
}

function seccion(id: string, hijos: NodoArbol[]): NodoArbol {
  return {
    id, padreId: null, tipo: "PANEL", codigo: id, titulo: id, orden: 0, nivel: 0, activo: true,
    puntajeMaximo: 0, reglaComentario: "NUNCA", evidenciaObligatoria: false,
    evidenciaMinima: 0, evidenciaMaxima: 0, opciones: [], hijos,
  };
}

function detalleGuardado(parcial: Partial<DetalleGuardado> = {}): DetalleGuardado {
  return { id: "d1", nodoId: "n1", valor: "SI", valores: [], comentario: null, puntajeObtenido: 10, puntajeMaximo: 10, ...parcial };
}

function certificacionCompleta(parcial: Partial<CertificacionCompleta> = {}): CertificacionCompleta {
  return {
    id: "cert1", empresaId: "e1", plantillaId: "p1", plantillaVersion: 1, inspectorId: "insp1",
    sucursalId: "s1", periodoEtiqueta: "Julio 2026", estado: "EN_PROGRESO",
    fechaInicio: new Date(), fechaFin: null, puntajeObtenido: 0, puntajeMaximo: 100,
    porcentajeCumplimiento: 0, clasificacion: null, observaciones: null,
    capturaOffline: false, sincronizadoEn: null,
    creadoEn: new Date(), actualizadoEn: new Date(),
    plantilla: { id: "p1", nombre: "Ficha", puntajeMaximo: 100, nodos: [seccion("s1", [nodoPregunta("n1")])], rangosResultado: [] },
    detalles: [], evidencias: [],
    ...parcial,
  };
}

function crearRepoMock(): CertificacionRepositoryPort & Record<string, Mock> {
  return {
    iniciar: vi.fn(),
    obtenerCompleta: vi.fn(),
    listar: vi.fn(),
    guardarRespuestasSeccion: vi.fn(),
    guardarEvidencia: vi.fn(),
    obtenerSucursalParaAlcance: vi.fn(),
    upsertDetallesConResolucionConflicto: vi.fn(),
    marcarSincronizado: vi.fn(),
  } as unknown as CertificacionRepositoryPort & Record<string, Mock>;
}

function loteBase(parcial: Partial<SincronizarLoteInput> = {}): SincronizarLoteInput {
  return {
    capturaOffline: true,
    respuestas: [{ nodoId: "n1", valor: "SI", capturadoEnCliente: new Date("2026-07-16T10:00:00Z") }],
    ...parcial,
  };
}

describe("SincronizarCapturaOfflineUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let responderUc: ResponderCertificacionUseCase;
  let registrarEventoAuditoria: Mock;
  let uc: SincronizarCapturaOfflineUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    responderUc = new ResponderCertificacionUseCase(repo, {} as AlmacenamientoEvidenciasPort);
    registrarEventoAuditoria = vi.fn().mockResolvedValue(undefined);
    uc = new SincronizarCapturaOfflineUseCase(repo, responderUc, registrarEventoAuditoria);
  });

  describe("sincronizarLote", () => {
    it("con una respuesta nueva (sin conflicto) llama upsertDetallesConResolucionConflicto una vez y no llama al puerto de auditoría", async () => {
      repo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
      repo.upsertDetallesConResolucionConflicto.mockResolvedValue([
        { detalle: detalleGuardado(), aplicado: true, conflicto: false },
      ]);

      const resultado = await uc.sincronizarLote("cert1", "e1", "u1", loteBase());

      expect(repo.upsertDetallesConResolucionConflicto).toHaveBeenCalledTimes(1);
      expect(registrarEventoAuditoria).not.toHaveBeenCalled();
      expect(resultado).toEqual({ procesadas: 1, conflictos: 0, pendientes: 0, sincronizadoEn: expect.any(String) });
    });

    it("cuando el servidor tiene una versión más reciente que capturadoEnCliente, conserva la del servidor y llama al puerto de auditoría con SINCRONIZACION_CONFLICTO", async () => {
      repo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
      repo.upsertDetallesConResolucionConflicto.mockResolvedValue([
        { detalle: detalleGuardado({ valor: "NO" }), aplicado: false, conflicto: true },
      ]);

      const resultado = await uc.sincronizarLote("cert1", "e1", "u1", loteBase());

      expect(registrarEventoAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ empresaId: "e1", usuarioId: "u1", accion: "SINCRONIZACION_CONFLICTO", entidadTipo: "InspeccionDetalle" }),
      );
      expect(resultado.conflictos).toBe(1);
    });

    it("al procesar un lote sin conflictos restantes llama repo.marcarSincronizado()", async () => {
      repo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
      repo.upsertDetallesConResolucionConflicto.mockResolvedValue([
        { detalle: detalleGuardado(), aplicado: true, conflicto: false },
      ]);

      await uc.sincronizarLote("cert1", "e1", "u1", loteBase());

      expect(repo.marcarSincronizado).toHaveBeenCalledWith("cert1", "e1", expect.any(Date), true);
    });

    it("lanza LoteSincronizacionExcedeLimiteError si el lote supera el límite, sin tocar el repositorio", async () => {
      const respuestas = Array.from({ length: LIMITE_LOTE_SINCRONIZACION + 1 }, (_, i) => ({
        nodoId: `n${i}`, valor: "SI", capturadoEnCliente: new Date(),
      }));

      await expect(uc.sincronizarLote("cert1", "e1", "u1", loteBase({ respuestas }))).rejects.toThrow(LoteSincronizacionExcedeLimiteError);
      expect(repo.obtenerCompleta).not.toHaveBeenCalled();
    });
  });

  describe("adjuntarEvidenciaPendiente", () => {
    it("lanza RespuestaNoSincronizadaError si no existe un detalle para el nodoId (evidencias van después que respuestas)", async () => {
      repo.obtenerCompleta.mockResolvedValue(certificacionCompleta({ detalles: [] }));

      await expect(
        uc.adjuntarEvidenciaPendiente("cert1", "e1", "n1", { buffer: Buffer.from(""), mimetype: "image/jpeg", originalname: "f.jpg", size: 10 }),
      ).rejects.toThrow(RespuestaNoSincronizadaError);
    });
  });
});
