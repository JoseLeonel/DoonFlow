import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { GestionarHallazgosUseCase } from "../application/casos-uso/gestionar-hallazgos.usecase";
import { InspeccionNoEncontradaError } from "../domain/inspeccion.errors";
import type { HallazgoRepositoryPort } from "../domain/hallazgo.repository.port";
import type { CertificacionRepositoryPort } from "../domain/certificacion.repository.port";
import type { AlmacenamientoEvidenciasPort } from "../domain/almacenamiento-evidencias.port";

function certificacionCompleta(detalles: any[] = []) {
  return {
    id: "cert1", empresaId: "e1", estado: "EN_PROGRESO", detalles,
    plantilla: { id: "p1", nombre: "Ficha", puntajeMaximo: 10, nodos: [], rangosResultado: [] },
    evidencias: [],
  } as any;
}

function crearRepoMock(): HallazgoRepositoryPort & Record<string, Mock> {
  return {
    listarPorInspeccion: vi.fn(),
    listarDetalleIdsConHallazgo: vi.fn(),
    crear: vi.fn(),
    crearVarios: vi.fn(),
    obtenerPorId: vi.fn(),
    actualizar: vi.fn(),
    agregarEvidencia: vi.fn(),
  } as unknown as HallazgoRepositoryPort & Record<string, Mock>;
}

describe("GestionarHallazgosUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let certificacionRepo: CertificacionRepositoryPort & Record<string, Mock>;
  let almacenamiento: AlmacenamientoEvidenciasPort & Record<string, Mock>;
  let uc: GestionarHallazgosUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    certificacionRepo = { obtenerCompleta: vi.fn() } as unknown as CertificacionRepositoryPort & Record<string, Mock>;
    almacenamiento = { subirArchivo: vi.fn() } as unknown as AlmacenamientoEvidenciasPort & Record<string, Mock>;
    uc = new GestionarHallazgosUseCase(repo, certificacionRepo, almacenamiento);
  });

  describe("crearManual", () => {
    it("lanza InspeccionNoEncontradaError si la certificación no existe", async () => {
      certificacionRepo.obtenerCompleta.mockResolvedValue(null);
      await expect(
        uc.crearManual("cert1", "e1", { descripcion: "x", severidad: "MENOR" }),
      ).rejects.toThrow(InspeccionNoEncontradaError);
      expect(repo.crear).not.toHaveBeenCalled();
    });

    it("llama a repo.crear con los datos exactos del input", async () => {
      certificacionRepo.obtenerCompleta.mockResolvedValue(certificacionCompleta());
      repo.crear.mockResolvedValue({ id: "h1" });

      await uc.crearManual("cert1", "e1", { descripcion: "Extintor vencido", severidad: "CRITICA", detalleId: "d1" });

      expect(repo.crear).toHaveBeenCalledWith({
        inspeccionId: "cert1", empresaId: "e1",
        descripcion: "Extintor vencido", severidad: "CRITICA", detalleId: "d1",
      });
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
      repo.crearVarios.mockResolvedValue([{ id: "h2" }]);

      const resultado = await uc.generarAutomaticos("cert1", "e1");

      expect(repo.crearVarios).toHaveBeenCalledWith([
        expect.objectContaining({ detalleId: "d2", severidad: "MAYOR" }),
      ]);
      expect(resultado).toEqual([{ id: "h2" }]);
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
