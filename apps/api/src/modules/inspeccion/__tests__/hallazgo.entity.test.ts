import { describe, it, expect } from "vitest";
import {
  calcularResultadoFinal,
  esIncumplimiento,
  generarHallazgosDesdeDetalles,
  severidadPorDefecto,
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
      { detalleId: "d2", descripcion: "Incumplimiento: Extintor vencido", severidad: "CRITICA" },
      { detalleId: "d3", descripcion: "Incumplimiento: Uniforme sin cofia", severidad: "MENOR" },
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
});
