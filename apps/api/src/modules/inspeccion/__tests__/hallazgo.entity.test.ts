import { describe, it, expect } from "vitest";
import {
  anularHallazgoPorApelacion,
  calcularResultadoFinal,
  esIncumplimiento,
  generarHallazgosDesdeComentarios,
  generarHallazgosDesdeDetalles,
  recalcularResultadoFinalExcluyendoAnulados,
  severidadPorDefecto,
  type DetalleParaComentarios,
  type DetalleParaHallazgo,
  type Hallazgo,
} from "../domain/hallazgo.entity";

function detalle(parcial: Partial<DetalleParaHallazgo> = {}): DetalleParaHallazgo {
  return { id: "d1", nodoId: "n1", preguntaTitulo: "Extintor vigente", puntajeObtenido: 10, puntajeMaximo: 10, ...parcial };
}

describe("esIncumplimiento", () => {
  it("con puntaje completo retorna false", () => {
    expect(esIncumplimiento(detalle({ puntajeObtenido: 10, puntajeMaximo: 10 }))).toBe(false);
  });

  it("con puntaje incompleto retorna true", () => {
    expect(esIncumplimiento(detalle({ puntajeObtenido: 5, puntajeMaximo: 10 }))).toBe(true);
  });
});

describe("severidadPorDefecto", () => {
  it("0% del puntaje sugiere CRITICA", () => {
    expect(severidadPorDefecto(detalle({ puntajeObtenido: 0, puntajeMaximo: 10 }))).toBe("CRITICA");
  });

  it("25% del puntaje sugiere MAYOR", () => {
    expect(severidadPorDefecto(detalle({ puntajeObtenido: 2.5, puntajeMaximo: 10 }))).toBe("MAYOR");
  });

  it("75% del puntaje sugiere MENOR", () => {
    expect(severidadPorDefecto(detalle({ puntajeObtenido: 7.5, puntajeMaximo: 10 }))).toBe("MENOR");
  });
});

describe("generarHallazgosDesdeDetalles", () => {
  it("con todos los detalles al máximo puntaje retorna []", () => {
    const detalles = [detalle({ id: "d1" }), detalle({ id: "d2" })];
    expect(generarHallazgosDesdeDetalles(detalles)).toEqual([]);
  });

  it("con mezcla de detalles cumplidos/incumplidos genera solo para los incumplidos", () => {
    const detalles = [
      detalle({ id: "d1", puntajeObtenido: 10, puntajeMaximo: 10 }),
      detalle({ id: "d2", preguntaTitulo: "Extintor vencido", puntajeObtenido: 0, puntajeMaximo: 10 }),
      detalle({ id: "d3", preguntaTitulo: "Uniforme sin cofia", puntajeObtenido: 7, puntajeMaximo: 10 }),
    ];

    const hallazgos = generarHallazgosDesdeDetalles(detalles);

    expect(hallazgos).toEqual([
      { detalleId: "d2", descripcion: "Incumplimiento: Extintor vencido", severidad: "CRITICA", categoria: "NO_CONFORMIDAD" },
      { detalleId: "d3", descripcion: "Incumplimiento: Uniforme sin cofia", severidad: "MENOR", categoria: "NO_CONFORMIDAD" },
    ]);
  });
});

describe("calcularResultadoFinal", () => {
  const h = (severidad: Hallazgo["severidad"]) => ({ severidad });

  it("sin hallazgos retorna APROBADA", () => {
    expect(calcularResultadoFinal([])).toBe("APROBADA");
  });

  it("solo con hallazgos MAYOR/MENOR retorna APROBADA_CON_OBSERVACIONES", () => {
    expect(calcularResultadoFinal([h("MAYOR"), h("MENOR")])).toBe("APROBADA_CON_OBSERVACIONES");
  });

  it("con al menos un hallazgo CRITICA retorna RECHAZADA", () => {
    expect(calcularResultadoFinal([h("MENOR"), h("CRITICA")])).toBe("RECHAZADA");
  });

  it("2026-07-25: ignora hallazgos informativos (severidad null, reconocimientos/observaciones) — solo cuenta no conformidades", () => {
    expect(calcularResultadoFinal([h(null)])).toBe("APROBADA");
    expect(calcularResultadoFinal([h(null), h("MENOR")])).toBe("APROBADA_CON_OBSERVACIONES");
  });
});

// ── 2026-07-25: comentarios categorizados (reconocimiento/observación/oportunidad de mejora) ──

describe("generarHallazgosDesdeComentarios", () => {
  const detalleComentarios = (parcial: Partial<DetalleParaComentarios> = {}): DetalleParaComentarios => ({
    id: "d1", preguntaTitulo: "Mantenimiento de equipos",
    comentarioReconocimiento: null, comentarioObservacion: null, comentarioOportunidadMejora: null,
    ...parcial,
  });

  it("sin comentarios en ningún detalle retorna []", () => {
    expect(generarHallazgosDesdeComentarios([detalleComentarios()])).toEqual([]);
  });

  it("genera un candidato por cada comentario no vacío, con su categoría", () => {
    const detalles = [
      detalleComentarios({ id: "d1", comentarioReconocimiento: "Equipo en excelente estado" }),
      detalleComentarios({ id: "d2", comentarioObservacion: "Falta pintura en el marco" }),
      detalleComentarios({ id: "d3", comentarioOportunidadMejora: "Podría automatizarse el registro" }),
    ];

    expect(generarHallazgosDesdeComentarios(detalles)).toEqual([
      { detalleId: "d1", descripcion: "Equipo en excelente estado", categoria: "RECONOCIMIENTO" },
      { detalleId: "d2", descripcion: "Falta pintura en el marco", categoria: "OBSERVACION" },
      { detalleId: "d3", descripcion: "Podría automatizarse el registro", categoria: "OPORTUNIDAD_MEJORA" },
    ]);
  });

  it("un mismo detalle con los 3 comentarios llenos genera los 3 candidatos", () => {
    const detalles = [detalleComentarios({
      comentarioReconocimiento: "Bien mantenido",
      comentarioObservacion: "Ruido leve del motor",
      comentarioOportunidadMejora: "Instalar sensor de vibración",
    })];

    expect(generarHallazgosDesdeComentarios(detalles)).toEqual([
      { detalleId: "d1", descripcion: "Bien mantenido", categoria: "RECONOCIMIENTO" },
      { detalleId: "d1", descripcion: "Ruido leve del motor", categoria: "OBSERVACION" },
      { detalleId: "d1", descripcion: "Instalar sensor de vibración", categoria: "OPORTUNIDAD_MEJORA" },
    ]);
  });

  it("ignora comentarios en blanco (solo espacios)", () => {
    expect(generarHallazgosDesdeComentarios([detalleComentarios({ comentarioReconocimiento: "   " })])).toEqual([]);
  });
});

// ── 011-aceptacion-apelaciones-certificacion ───────────────────────────────

describe("anularHallazgoPorApelacion", () => {
  it("devuelve una copia con estado ANULADO_POR_APELACION", () => {
    const hallazgo = { estado: "ACTIVO" as const };
    expect(anularHallazgoPorApelacion(hallazgo)).toEqual({ estado: "ANULADO_POR_APELACION" });
    expect(hallazgo.estado).toBe("ACTIVO");
  });
});

describe("recalcularResultadoFinalExcluyendoAnulados", () => {
  const h = (severidad: Hallazgo["severidad"], estado: Hallazgo["estado"] = "ACTIVO") => ({ severidad, estado });

  it("excluye los hallazgos ANULADO_POR_APELACION del cálculo de severidad", () => {
    const resultado = recalcularResultadoFinalExcluyendoAnulados([
      h("CRITICA", "ANULADO_POR_APELACION"),
      h("MENOR", "ACTIVO"),
    ]);
    expect(resultado).toBe("APROBADA_CON_OBSERVACIONES");
  });

  it("si todos los hallazgos activos quedan anulados, retorna APROBADA", () => {
    expect(recalcularResultadoFinalExcluyendoAnulados([h("CRITICA", "ANULADO_POR_APELACION")])).toBe("APROBADA");
  });

  it("un hallazgo CRITICA activo sigue rechazando aunque otro esté anulado", () => {
    expect(recalcularResultadoFinalExcluyendoAnulados([h("CRITICA", "ACTIVO"), h("MENOR", "ANULADO_POR_APELACION")])).toBe("RECHAZADA");
  });
});
