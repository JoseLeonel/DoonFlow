import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mocked } from "vitest";
import { GestionarHallazgosUseCase } from "../application/casos-uso/gestionar-hallazgos.usecase";
import { InspeccionNoEncontradaError } from "../domain/inspeccion.errors";
import type { HallazgoRepositoryPort } from "../domain/hallazgo.repository.port";
import type { CertificacionRepositoryPort } from "../domain/certificacion.repository.port";
import type { AlmacenamientoEvidenciasPort } from "../domain/almacenamiento-evidencias.port";

function certificacionCompleta(detalles: any[] = [], sucursalId: string | null = null): any {
  return {
    id: "cert1", empresaId: "e1", estado: "EN_PROGRESO", detalles, sucursalId,
    plantilla: { id: "p1", nombre: "Ficha", puntajeMaximo: 10, nodos: [], rangosResultado: [] },
    evidencias: [],
  };
}

function crearRepoMock(): Mocked<HallazgoRepositoryPort> {
  return {
    listarPorInspeccion: vi.fn(),
    listarDetalleIdsConHallazgo: vi.fn(),
    listarClavesComentarioConHallazgo: vi.fn(),
    crear: vi.fn(),
    crearVarios: vi.fn(),
    obtenerPorId: vi.fn(),
    actualizar: vi.fn(),
    agregarEvidencia: vi.fn(),
    anularPorApelacion: vi.fn(),
  };
}

function crearCertificacionRepoMock(): Mocked<CertificacionRepositoryPort> {
  return {
    iniciar: vi.fn(), obtenerCompleta: vi.fn(), listar: vi.fn(), guardarRespuestasSeccion: vi.fn(),
    guardarEvidencia: vi.fn(), obtenerSucursalParaAlcance: vi.fn(), upsertDetallesConResolucionConflicto: vi.fn(),
    marcarSincronizado: vi.fn(), firmar: vi.fn(), establecerPdfUrl: vi.fn(), aceptar: vi.fn(), actualizarResultadoFinal: vi.fn(), actualizarResumenProgreso: vi.fn(),
    buscarPeriodoVigente: vi.fn(), finalizar: vi.fn(),
  };
}

describe("GestionarHallazgosUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let certificacionRepo: Mocked<CertificacionRepositoryPort>;
  let almacenamiento: Mocked<AlmacenamientoEvidenciasPort>;
  let uc: GestionarHallazgosUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    certificacionRepo = crearCertificacionRepoMock();
    almacenamiento = { subirArchivo: vi.fn() };
    uc = new GestionarHallazgosUseCase(repo, certificacionRepo, almacenamiento);
  });

  describe("crearManual", () => {
    it("lanza InspeccionNoEncontradaError si la certificación no existe", async () => {
      certificacionRepo.obtenerCompleta.mockResolvedValue(null);
      await expect(
        uc.crearManual("cert1", "e1", { descripcion: "x", categoria: "NO_CONFORMIDAD", severidad: "MENOR" }),
      ).rejects.toThrow(InspeccionNoEncontradaError);
      expect(repo.crear).not.toHaveBeenCalled();
    });

    it("llama a repo.crear con los datos exactos del input", async () => {
      certificacionRepo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
      repo.crear.mockResolvedValue({ id: "h1" } as any);

      await uc.crearManual("cert1", "e1", { descripcion: "Extintor vencido", categoria: "NO_CONFORMIDAD", severidad: "CRITICA", detalleId: "d1" });

      expect(repo.crear).toHaveBeenCalledWith({
        inspeccionId: "cert1", empresaId: "e1",
        descripcion: "Extintor vencido", categoria: "NO_CONFORMIDAD", severidad: "CRITICA", detalleId: "d1",
      });
    });

    it("006-vigencia-notificaciones-portal: notifica al cliente cuando el hallazgo es CRITICA", async () => {
      certificacionRepo.obtenerCompleta.mockResolvedValue(certificacionCompleta([], "s1"));
      certificacionRepo.obtenerSucursalParaAlcance.mockResolvedValue({ id: "s1", nombre: "Planta Central", clienteId: "c1", activo: true });
      repo.crear.mockResolvedValue({ id: "h1", severidad: "CRITICA" } as any);
      const notificarCliente = vi.fn();
      const ucConNotificacion = new GestionarHallazgosUseCase(repo, certificacionRepo, almacenamiento, notificarCliente);

      await ucConNotificacion.crearManual("cert1", "e1", { descripcion: "Extintor vencido", categoria: "NO_CONFORMIDAD", severidad: "CRITICA" });

      expect(notificarCliente).toHaveBeenCalledWith(expect.objectContaining({
        clienteId: "c1", empresaId: "e1", tipo: "HALLAZGO_CRITICO", referenciaTipo: "hallazgo", referenciaId: "h1",
      }));
    });

    it("006-vigencia-notificaciones-portal: no notifica si el hallazgo no es CRITICA", async () => {
      certificacionRepo.obtenerCompleta.mockResolvedValue(certificacionCompleta([], "s1"));
      repo.crear.mockResolvedValue({ id: "h1", severidad: "MENOR" } as any);
      const notificarCliente = vi.fn();
      const ucConNotificacion = new GestionarHallazgosUseCase(repo, certificacionRepo, almacenamiento, notificarCliente);

      await ucConNotificacion.crearManual("cert1", "e1", { descripcion: "x", categoria: "NO_CONFORMIDAD", severidad: "MENOR" });

      expect(notificarCliente).not.toHaveBeenCalled();
    });
  });

  describe("generarAutomaticos", () => {
    it("no duplica hallazgos ya generados para el mismo detalleId", async () => {
      certificacionRepo.obtenerCompleta.mockResolvedValue(
        certificacionCompleta([
          { id: "d1", nodoId: "n1", preguntaTitulo: "Ya tiene hallazgo", puntajeObtenido: 0, puntajeMaximo: 10 },
          { id: "d2", nodoId: "n2", preguntaTitulo: "Nuevo incumplimiento", puntajeObtenido: 3, puntajeMaximo: 10 },
        ]),
      );
      repo.listarDetalleIdsConHallazgo.mockResolvedValue(new Set(["d1"]));
      repo.crearVarios.mockResolvedValue([{ id: "h2" }] as any);

      const resultado = await uc.generarAutomaticos("cert1", "e1");

      expect(repo.crearVarios).toHaveBeenCalledWith([
        expect.objectContaining({ detalleId: "d2", severidad: "MAYOR" }),
      ]);
      expect(resultado).toEqual([{ id: "h2" }] as any);
    });

    it("no llama a crearVarios si no hay incumplimientos nuevos", async () => {
      certificacionRepo.obtenerCompleta.mockResolvedValue(
        certificacionCompleta([{ id: "d1", nodoId: "n1", preguntaTitulo: "Ya cubierto", puntajeObtenido: 0, puntajeMaximo: 10 }]),
      );
      repo.listarDetalleIdsConHallazgo.mockResolvedValue(new Set(["d1"]));

      const resultado = await uc.generarAutomaticos("cert1", "e1");

      expect(repo.crearVarios).not.toHaveBeenCalled();
      expect(resultado).toEqual([]);
    });
  });
});
