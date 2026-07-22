import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { ResponderCertificacionUseCase } from "../application/casos-uso/responder-certificacion.usecase";
import { CertificacionNoEditableError, InspeccionNoEncontradaError } from "../domain/inspeccion.errors";
import type { AlmacenamientoEvidenciasPort } from "../domain/almacenamiento-evidencias.port";
import type { CertificacionRepositoryPort, CertificacionCompleta } from "../domain/certificacion.repository.port";
import type { NodoArbol } from "../domain/plantilla.entity";

function crearRepoMock(): CertificacionRepositoryPort & Record<string, Mock> {
  return {
    iniciar: vi.fn(),
    obtenerCompleta: vi.fn(),
    listar: vi.fn(),
    guardarRespuestasSeccion: vi.fn(),
    guardarEvidencia: vi.fn(),
    obtenerSucursalParaAlcance: vi.fn(),
  } as unknown as CertificacionRepositoryPort & Record<string, Mock>;
}

function crearAlmacenamientoMock(): AlmacenamientoEvidenciasPort & Record<string, Mock> {
  return { subirArchivo: vi.fn() } as unknown as AlmacenamientoEvidenciasPort & Record<string, Mock>;
}

function nodoPregunta(id: string, parcial: Partial<NodoArbol> = {}): NodoArbol {
  return {
    id, padreId: "s1", tipo: "PREGUNTA", codigo: id, titulo: `Pregunta ${id}`,
    orden: 0, nivel: 1, activo: true, tipoRespuesta: "SI_NO", puntajeMaximo: 10,
    reglaComentario: "NUNCA", evidenciaObligatoria: false, evidenciaMinima: 0,
    evidenciaMaxima: 0, opciones: [], hijos: [], ...parcial,
  };
}

function certificacionCompleta(parcial: Partial<CertificacionCompleta> = {}): CertificacionCompleta {
  return {
    id: "cert1", empresaId: "e1", plantillaId: "p1", plantillaVersion: 1, inspectorId: "insp1",
    sucursalId: "s1", periodoEtiqueta: "Julio 2026", estado: "EN_PROGRESO",
    fechaInicio: new Date(), fechaFin: null, puntajeObtenido: 0, puntajeMaximo: 100,
    porcentajeCumplimiento: 0, clasificacion: null, observaciones: null,
    capturaOffline: false, sincronizadoEn: null,
    firmadoPorId: null, firmadoEn: null, codigoVerificacion: null, pdfUrl: null,
    fechaVencimiento: null, resultadoFinal: null,
    creadoEn: new Date(), actualizadoEn: new Date(),
    plantilla: { id: "p1", nombre: "Ficha", puntajeMaximo: 100, nodos: [], rangosResultado: [] },
    detalles: [], evidencias: [],
    ...parcial,
  };
}

describe("ResponderCertificacionUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let almacenamiento: ReturnType<typeof crearAlmacenamientoMock>;
  let uc: ResponderCertificacionUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    almacenamiento = crearAlmacenamientoMock();
    uc = new ResponderCertificacionUseCase(repo, almacenamiento);
  });

  describe("guardarRespuestasSeccion", () => {
    it("lanza InspeccionNoEncontradaError si la certificación no existe", async () => {
      repo.obtenerCompleta.mockResolvedValue(null);

      await expect(uc.guardarRespuestasSeccion("cert1", "e1", { respuestas: [{ nodoId: "n1" }] }))
        .rejects.toThrow(InspeccionNoEncontradaError);
    });

    it("lanza CertificacionNoEditableError si la certificación ya no admite edición", async () => {
      repo.obtenerCompleta.mockResolvedValue(certificacionCompleta({ estado: "FIRMADA" as any }));

      await expect(uc.guardarRespuestasSeccion("cert1", "e1", { respuestas: [{ nodoId: "n1" }] }))
        .rejects.toThrow(CertificacionNoEditableError);
    });

    it("calcula el snapshot (ruta/título/puntaje) solo para los nodoId recibidos y los pasa al repositorio", async () => {
      const seccion: NodoArbol = {
        id: "s1", padreId: null, tipo: "PANEL", codigo: "S1", titulo: "Sección 1", orden: 0, nivel: 0,
        activo: true, puntajeMaximo: 0, reglaComentario: "NUNCA", evidenciaObligatoria: false,
        evidenciaMinima: 0, evidenciaMaxima: 0, opciones: [],
        hijos: [nodoPregunta("n1"), nodoPregunta("n2")],
      };
      repo.obtenerCompleta.mockResolvedValue(certificacionCompleta({
        plantilla: { id: "p1", nombre: "Ficha", puntajeMaximo: 20, nodos: [seccion], rangosResultado: [] },
      }));
      repo.guardarRespuestasSeccion.mockResolvedValue([]);

      await uc.guardarRespuestasSeccion("cert1", "e1", { respuestas: [{ nodoId: "n1", valor: "SI" }] });

      expect(repo.guardarRespuestasSeccion).toHaveBeenCalledWith("cert1", [
        expect.objectContaining({ nodoId: "n1", valor: "SI", puntajeObtenido: 10, puntajeMaximo: 10, rutaCodigos: "S1|n1" }),
      ]);
    });
  });

  describe("obtenerResumen", () => {
    it("usa calcularResumen sobre los detalles y la plantilla cargados", async () => {
      const pregunta = nodoPregunta("n1", { puntajeMaximo: 50 });
      const seccion: NodoArbol = {
        id: "s1", padreId: null, tipo: "PANEL", codigo: "S1", titulo: "Sección 1", orden: 0, nivel: 0,
        activo: true, puntajeMaximo: 0, reglaComentario: "NUNCA", evidenciaObligatoria: false,
        evidenciaMinima: 0, evidenciaMaxima: 0, opciones: [], hijos: [pregunta],
      };
      repo.obtenerCompleta.mockResolvedValue(certificacionCompleta({
        plantilla: { id: "p1", nombre: "Ficha", puntajeMaximo: 50, nodos: [seccion], rangosResultado: [] },
        detalles: [{ id: "d1", nodoId: "n1", valor: "SI", valores: [], comentario: null, puntajeObtenido: 50, puntajeMaximo: 50 }],
      }));

      const resumen = await uc.obtenerResumen("cert1", "e1");

      expect(resumen.puntajeObtenido).toBe(50);
      expect(resumen.puntajeMaximo).toBe(50);
      expect(resumen.porcentajeCumplimiento).toBe(100);
      expect(resumen.porSeccion).toEqual([{ seccionId: "s1", titulo: "Sección 1", respondidas: 1, total: 1 }]);
    });
  });
});
