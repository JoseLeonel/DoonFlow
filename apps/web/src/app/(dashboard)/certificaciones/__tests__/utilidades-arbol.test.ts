import { describe, it, expect } from "vitest";
import { idsPreguntasDelArbol, preguntasDelArbol, calcularPuntajeRespuestaLocal } from "../_hooks/utilidades-arbol";
import type { NodoArbol } from "@doonflow/shared";

function pregunta(parcial: Partial<NodoArbol> = {}): NodoArbol {
  return {
    id: "p1", padreId: "s1", tipo: "PREGUNTA", codigo: "1.1", titulo: "Pregunta", orden: 0, nivel: 1,
    activo: true, puntajeMaximo: 10, evidenciaObligatoria: false,
    evidenciaMinima: 0, evidenciaMaxima: 0, opciones: [], hijos: [],
    ...parcial,
  };
}

function panel(id: string, hijos: NodoArbol[]): NodoArbol {
  return {
    id, padreId: null, tipo: "PANEL", codigo: id, titulo: id, orden: 0, nivel: 0, activo: true,
    puntajeMaximo: 0, evidenciaObligatoria: false,
    evidenciaMinima: 0, evidenciaMaxima: 0, opciones: [], hijos,
  };
}

describe("idsPreguntasDelArbol / preguntasDelArbol", () => {
  it("recolecta los ids/nodos de las preguntas anidadas en varios niveles", () => {
    const arbol = panel("s1", [panel("s1.1", [pregunta({ id: "p1" }), pregunta({ id: "p2" })])]);
    expect(idsPreguntasDelArbol(arbol)).toEqual(["p1", "p2"]);
    expect(preguntasDelArbol(arbol).map((n) => n.id)).toEqual(["p1", "p2"]);
  });
});

describe("calcularPuntajeRespuestaLocal", () => {
  it("SI_NO: puntaje completo si valor es SI, 0 en cualquier otro caso", () => {
    const nodo = pregunta({ tipoRespuesta: "SI_NO", puntajeMaximo: 10 });
    expect(calcularPuntajeRespuestaLocal(nodo, "SI")).toBe(10);
    expect(calcularPuntajeRespuestaLocal(nodo, "NO")).toBe(0);
    expect(calcularPuntajeRespuestaLocal(nodo, undefined)).toBe(0);
  });

  it("PUNTAJE_MANUAL: usa el número ingresado, acotado al máximo y nunca negativo", () => {
    const nodo = pregunta({ tipoRespuesta: "PUNTAJE_MANUAL", puntajeMaximo: 5 });
    expect(calcularPuntajeRespuestaLocal(nodo, "3")).toBe(3);
    expect(calcularPuntajeRespuestaLocal(nodo, "999")).toBe(5);
    expect(calcularPuntajeRespuestaLocal(nodo, "-1")).toBe(0);
    expect(calcularPuntajeRespuestaLocal(nodo, "no-numero")).toBe(0);
  });

  it("POR_OPCIONES: suma el puntaje de las opciones seleccionadas, acotado al máximo", () => {
    const nodo = pregunta({
      tipoRespuesta: "SELECCION_MULTIPLE", modalidadPuntaje: "POR_OPCIONES", puntajeMaximo: 10,
      opciones: [
        { id: "o1", etiqueta: "A", puntaje: 4, orden: 0 },
        { id: "o2", etiqueta: "B", puntaje: 8, orden: 1 },
      ],
    });
    expect(calcularPuntajeRespuestaLocal(nodo, undefined, ["o1"])).toBe(4);
    expect(calcularPuntajeRespuestaLocal(nodo, undefined, ["o1", "o2"])).toBe(10);
  });

  it("sin modalidad de puntaje ni tipo reconocido devuelve 0", () => {
    const nodo = pregunta({ tipoRespuesta: "TEXTO_LIBRE", puntajeMaximo: 10 });
    expect(calcularPuntajeRespuestaLocal(nodo, "cualquier texto")).toBe(0);
  });
});
