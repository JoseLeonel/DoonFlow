import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mocked } from "vitest";
import { GestionarPlantillaUseCase } from "../application/casos-uso/gestionar-plantilla.usecase";
import {
  ComentarioResolucionRequeridoError,
  EstadoAprobacionInvalidoError,
  PlantillaNoEncontradaError,
  PlantillaSinPreguntasError,
  RangosInvalidosError,
} from "../domain/inspeccion.errors";
import type { PlantillaRepositoryPort } from "../domain/plantilla.repository.port";
import type { AuditoriaRepositoryPort } from "../domain/auditoria.repository.port";
import type { Plantilla, PlantillaCompleta, NodoArbol, RangoResultado } from "../domain/plantilla.entity";

// ── Repositorio simulado ───────────────────────────────────────────────────────

function crearRepoMock(): Mocked<PlantillaRepositoryPort> {
  return {
    listar: vi.fn(),
    obtenerCompleta: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    cambiarEstado: vi.fn(),
    eliminar: vi.fn(),
    clonar: vi.fn(),
    crearNodo: vi.fn(),
    actualizarNodo: vi.fn(),
    contarHijosNodo: vi.fn(),
    eliminarNodo: vi.fn(),
    reordenarNodos: vi.fn(),
    guardarRangos: vi.fn(),
    cambiarEstadoAprobacion: vi.fn(),
    listarPendientesAprobacion: vi.fn(),
  };
}

function crearAuditoriaMock(): Mocked<AuditoriaRepositoryPort> {
  return { registrar: vi.fn() };
}

// ── Fábricas ────────────────────────────────────────────────────────────────────

function plantillaCompleta(parcial: Partial<PlantillaCompleta> = {}): PlantillaCompleta {
  return {
    id: "p1",
    empresaId: "e1",
    nombre: "Ficha test",
    tipo: "CALIDAD",
    activa: true,
    puntajeMaximo: 100,
    version: 1,
    creadoEn: new Date("2026-01-01"),
    actualizadoEn: new Date("2026-01-01"),
    estadoAprobacion: "BORRADOR",
    nodos: [],
    rangosResultado: [],
    ...parcial,
  };
}

function rangoSinId(parcial: Partial<Omit<RangoResultado, "id">> = {}): Omit<RangoResultado, "id"> {
  return { desde: 0, hasta: 100, clasificacion: "Aprobado", color: "green", orden: 0, ...parcial };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GestionarPlantillaUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let auditoria: ReturnType<typeof crearAuditoriaMock>;
  let uc: GestionarPlantillaUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    auditoria = crearAuditoriaMock();
    uc = new GestionarPlantillaUseCase(repo, auditoria);
  });

  // obtenerCompleta

  describe("obtenerCompleta", () => {
    it("delega en el repositorio y retorna la plantilla cuando existe", async () => {
      const p = plantillaCompleta();
      repo.obtenerCompleta.mockResolvedValue(p);

      const resultado = await uc.obtenerCompleta("p1", "e1");

      expect(repo.obtenerCompleta).toHaveBeenCalledWith("p1", "e1");
      expect(resultado).toBe(p);
    });

    it("lanza PlantillaNoEncontradaError cuando el repositorio retorna null", async () => {
      repo.obtenerCompleta.mockResolvedValue(null);

      await expect(uc.obtenerCompleta("p1", "e1")).rejects.toThrow(PlantillaNoEncontradaError);
    });
  });

  // actualizar

  describe("actualizar", () => {
    it("actualiza cuando la plantilla existe", async () => {
      const p = plantillaCompleta();
      repo.obtenerCompleta.mockResolvedValue(p);
      repo.actualizar.mockResolvedValue({ ...p, nombre: "Nuevo nombre" } as Plantilla);

      const resultado = await uc.actualizar("p1", "e1", "u1", { nombre: "Nuevo nombre" });

      expect(repo.actualizar).toHaveBeenCalledWith("p1", "e1", expect.objectContaining({ nombre: "Nuevo nombre" }));
      expect(resultado.nombre).toBe("Nuevo nombre");
      expect(repo.cambiarEstadoAprobacion).not.toHaveBeenCalled();
    });

    it("lanza PlantillaNoEncontradaError cuando la plantilla no existe", async () => {
      repo.obtenerCompleta.mockResolvedValue(null);

      await expect(uc.actualizar("p1", "e1", "u1", { nombre: "X" })).rejects.toThrow(PlantillaNoEncontradaError);
      expect(repo.actualizar).not.toHaveBeenCalled();
    });

    it("revierte a BORRADOR si la plantilla estaba APROBADA (007)", async () => {
      const p = plantillaCompleta({ estadoAprobacion: "APROBADA" });
      repo.obtenerCompleta.mockResolvedValue(p);
      repo.actualizar.mockResolvedValue({ ...p, nombre: "Nuevo nombre" } as Plantilla);
      repo.cambiarEstadoAprobacion.mockResolvedValue({ ...p, estadoAprobacion: "BORRADOR" } as Plantilla);

      const resultado = await uc.actualizar("p1", "e1", "u1", { nombre: "Nuevo nombre" });

      expect(repo.cambiarEstadoAprobacion).toHaveBeenCalledWith("p1", "e1", expect.objectContaining({ estadoAprobacion: "BORRADOR" }));
      expect(auditoria.registrar).toHaveBeenCalledWith(expect.objectContaining({ accion: "EDITAR_REVIERTE_BORRADOR" }));
      expect(resultado.estadoAprobacion).toBe("BORRADOR");
    });
  });

  // eliminar

  describe("eliminar", () => {
    it("elimina cuando la plantilla existe", async () => {
      repo.obtenerCompleta.mockResolvedValue(plantillaCompleta());
      repo.eliminar.mockResolvedValue(undefined);

      await uc.eliminar("p1", "e1");

      expect(repo.eliminar).toHaveBeenCalledWith("p1", "e1");
    });

    it("lanza PlantillaNoEncontradaError cuando la plantilla no existe", async () => {
      repo.obtenerCompleta.mockResolvedValue(null);

      await expect(uc.eliminar("p1", "e1")).rejects.toThrow(PlantillaNoEncontradaError);
      expect(repo.eliminar).not.toHaveBeenCalled();
    });
  });

  // crearNodo

  describe("crearNodo", () => {
    it("calcula nivel 0 para un nodo sin padre", async () => {
      repo.obtenerCompleta.mockResolvedValue(plantillaCompleta({ nodos: [] }));
      repo.crearNodo.mockResolvedValue({ id: "n1" } as NodoArbol);

      await uc.crearNodo("p1", "e1", {
        tipo: "PANEL", codigo: "S1", titulo: "Sección", orden: 0,
      } as any);

      expect(repo.crearNodo).toHaveBeenCalledWith(
        expect.objectContaining({ nivel: 0, plantillaId: "p1", empresaId: "e1" }),
      );
    });

    it("calcula nivel del padre + 1 para un nodo con padre", async () => {
      const padreNodo: NodoArbol = {
        id: "s1", padreId: null, tipo: "PANEL", codigo: "S1", titulo: "Sección",
        orden: 0, nivel: 0, activo: true, puntajeMaximo: 0,
 evidenciaObligatoria: false,
        evidenciaMinima: 0, evidenciaMaxima: 0, opciones: [], hijos: [],
      };
      repo.obtenerCompleta.mockResolvedValue(plantillaCompleta({ nodos: [padreNodo] }));
      repo.crearNodo.mockResolvedValue({ id: "n2" } as NodoArbol);

      await uc.crearNodo("p1", "e1", {
        tipo: "PREGUNTA", codigo: "P1", titulo: "Pregunta", orden: 0, padreId: "s1",
      } as any);

      expect(repo.crearNodo).toHaveBeenCalledWith(
        expect.objectContaining({ nivel: 1, padreId: "s1" }),
      );
    });

    it("lanza PlantillaNoEncontradaError si la plantilla no existe", async () => {
      repo.obtenerCompleta.mockResolvedValue(null);

      await expect(
        uc.crearNodo("p1", "e1", { tipo: "PANEL", codigo: "S1", titulo: "S", orden: 0 } as any),
      ).rejects.toThrow(PlantillaNoEncontradaError);
    });
  });

  // guardarRangos

  describe("guardarRangos", () => {
    it("guarda rangos válidos sin solapamiento", async () => {
      repo.obtenerCompleta.mockResolvedValue(plantillaCompleta());
      repo.guardarRangos.mockResolvedValue([]);

      const rangos = [
        rangoSinId({ desde: 0,  hasta: 59,  clasificacion: "Reprobado", orden: 0 }),
        rangoSinId({ desde: 60, hasta: 100, clasificacion: "Aprobado",  orden: 1 }),
      ];

      await uc.guardarRangos("p1", "e1", rangos);

      expect(repo.guardarRangos).toHaveBeenCalledWith("p1", "e1", rangos);
    });

    it("lanza RangosInvalidosError cuando hay solapamiento", async () => {
      repo.obtenerCompleta.mockResolvedValue(plantillaCompleta());

      const rangos = [
        rangoSinId({ desde: 0,  hasta: 70,  clasificacion: "A", orden: 0 }),
        rangoSinId({ desde: 60, hasta: 100, clasificacion: "B", orden: 1 }),
      ];

      await expect(uc.guardarRangos("p1", "e1", rangos)).rejects.toThrow(RangosInvalidosError);
      expect(repo.guardarRangos).not.toHaveBeenCalled();
    });

    it("lanza PlantillaNoEncontradaError cuando la plantilla no existe", async () => {
      repo.obtenerCompleta.mockResolvedValue(null);

      await expect(uc.guardarRangos("p1", "e1", [])).rejects.toThrow(PlantillaNoEncontradaError);
    });
  });

  // ── Aprobación (007-gobernanza-permisos-aprobacion) ────────────────────────

  describe("enviarARevision", () => {
    it("lanza PlantillaSinPreguntasError si la plantilla no tiene preguntas", async () => {
      repo.obtenerCompleta.mockResolvedValue(plantillaCompleta({ nodos: [] }));

      await expect(uc.enviarARevision("p1", "e1", "u1")).rejects.toThrow(PlantillaSinPreguntasError);
      expect(repo.cambiarEstadoAprobacion).not.toHaveBeenCalled();
    });

    it("lanza EstadoAprobacionInvalidoError si la plantilla no está en BORRADOR", async () => {
      const pregunta: NodoArbol = {
        id: "n1", padreId: null, tipo: "PREGUNTA", codigo: "P1", titulo: "P", orden: 0, nivel: 0,
        activo: true, puntajeMaximo: 10, evidenciaObligatoria: false,
        evidenciaMinima: 0, evidenciaMaxima: 0, opciones: [], hijos: [],
      };
      repo.obtenerCompleta.mockResolvedValue(plantillaCompleta({ nodos: [pregunta], estadoAprobacion: "EN_REVISION" }));

      await expect(uc.enviarARevision("p1", "e1", "u1")).rejects.toThrow(EstadoAprobacionInvalidoError);
    });

    it("envía a revisión, registra auditoría y setea solicitadoPorId/solicitadoEn", async () => {
      const pregunta: NodoArbol = {
        id: "n1", padreId: null, tipo: "PREGUNTA", codigo: "P1", titulo: "P", orden: 0, nivel: 0,
        activo: true, puntajeMaximo: 10, evidenciaObligatoria: false,
        evidenciaMinima: 0, evidenciaMaxima: 0, opciones: [], hijos: [],
      };
      const p = plantillaCompleta({ nodos: [pregunta], estadoAprobacion: "BORRADOR" });
      repo.obtenerCompleta.mockResolvedValue(p);
      repo.cambiarEstadoAprobacion.mockResolvedValue({ ...p, estadoAprobacion: "EN_REVISION" } as Plantilla);

      await uc.enviarARevision("p1", "e1", "u1");

      expect(repo.cambiarEstadoAprobacion).toHaveBeenCalledWith("p1", "e1", expect.objectContaining({
        estadoAprobacion: "EN_REVISION", solicitadoPorId: "u1",
      }));
      expect(auditoria.registrar).toHaveBeenCalledWith(expect.objectContaining({ accion: "ENVIAR_REVISION" }));
    });
  });

  describe("aprobar", () => {
    it("lanza EstadoAprobacionInvalidoError si la plantilla no está EN_REVISION", async () => {
      repo.obtenerCompleta.mockResolvedValue(plantillaCompleta({ estadoAprobacion: "BORRADOR" }));

      await expect(uc.aprobar("p1", "e1", "u1")).rejects.toThrow(EstadoAprobacionInvalidoError);
    });

    it("aprueba y setea aprobadorId/resueltoEn", async () => {
      const p = plantillaCompleta({ estadoAprobacion: "EN_REVISION" });
      repo.obtenerCompleta.mockResolvedValue(p);
      repo.cambiarEstadoAprobacion.mockResolvedValue({ ...p, estadoAprobacion: "APROBADA" } as Plantilla);

      await uc.aprobar("p1", "e1", "u1");

      expect(repo.cambiarEstadoAprobacion).toHaveBeenCalledWith("p1", "e1", expect.objectContaining({
        estadoAprobacion: "APROBADA", aprobadorId: "u1",
      }));
      expect(auditoria.registrar).toHaveBeenCalledWith(expect.objectContaining({ accion: "APROBAR" }));
    });
  });

  describe("rechazar", () => {
    it("lanza EstadoAprobacionInvalidoError si la plantilla no está EN_REVISION", async () => {
      repo.obtenerCompleta.mockResolvedValue(plantillaCompleta({ estadoAprobacion: "BORRADOR" }));

      await expect(uc.rechazar("p1", "e1", "u1", "comentario")).rejects.toThrow(EstadoAprobacionInvalidoError);
    });

    it("lanza ComentarioResolucionRequeridoError si el comentario está vacío", async () => {
      repo.obtenerCompleta.mockResolvedValue(plantillaCompleta({ estadoAprobacion: "EN_REVISION" }));

      await expect(uc.rechazar("p1", "e1", "u1", "  ")).rejects.toThrow(ComentarioResolucionRequeridoError);
      expect(repo.cambiarEstadoAprobacion).not.toHaveBeenCalled();
    });

    it("rechaza y guarda el comentario de resolución", async () => {
      const p = plantillaCompleta({ estadoAprobacion: "EN_REVISION" });
      repo.obtenerCompleta.mockResolvedValue(p);
      repo.cambiarEstadoAprobacion.mockResolvedValue({ ...p, estadoAprobacion: "RECHAZADA" } as Plantilla);

      await uc.rechazar("p1", "e1", "u1", "Faltan preguntas");

      expect(repo.cambiarEstadoAprobacion).toHaveBeenCalledWith("p1", "e1", expect.objectContaining({
        estadoAprobacion: "RECHAZADA", aprobadorId: "u1", comentarioResolucion: "Faltan preguntas",
      }));
      expect(auditoria.registrar).toHaveBeenCalledWith(expect.objectContaining({ accion: "RECHAZAR" }));
    });
  });

  describe("actualizarNodo", () => {
    it("revierte a BORRADOR si la plantilla estaba RECHAZADA (007)", async () => {
      const p = plantillaCompleta({ estadoAprobacion: "RECHAZADA" });
      repo.obtenerCompleta.mockResolvedValue(p);
      repo.actualizarNodo.mockResolvedValue({ id: "n1" } as NodoArbol);
      repo.cambiarEstadoAprobacion.mockResolvedValue({ ...p, estadoAprobacion: "BORRADOR" } as Plantilla);

      await uc.actualizarNodo("p1", "n1", "e1", "u1", { titulo: "Nuevo título" });

      expect(repo.cambiarEstadoAprobacion).toHaveBeenCalledWith("p1", "e1", expect.objectContaining({ estadoAprobacion: "BORRADOR" }));
    });

    it("no revierte si la plantilla ya estaba en BORRADOR", async () => {
      repo.obtenerCompleta.mockResolvedValue(plantillaCompleta({ estadoAprobacion: "BORRADOR" }));
      repo.actualizarNodo.mockResolvedValue({ id: "n1" } as NodoArbol);

      await uc.actualizarNodo("p1", "n1", "e1", "u1", { titulo: "Nuevo título" });

      expect(repo.cambiarEstadoAprobacion).not.toHaveBeenCalled();
    });
  });
});
