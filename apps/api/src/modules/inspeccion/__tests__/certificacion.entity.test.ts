import { describe, it, expect } from "vitest";
import {
  puedeEditarRespuestas,
  puedeFirmarse,
  puedeEjecutarCertificacion,
  calcularResumen,
  calcularResumenPorSeccion,
  calcularPuntajeRespuesta,
  generarCodigoVerificacion,
  calcularFechaVencimiento,
} from "../domain/certificacion.entity";
import type { RangoResultado, NodoArbol } from "../domain/plantilla.entity";

function nodoPregunta(parcial: Partial<NodoArbol> = {}): NodoArbol {
  return {
    id: "n1",
    padreId: "s1",
    tipo: "PREGUNTA",
    codigo: "1.1",
    titulo: "Pregunta",
    orden: 0,
    nivel: 1,
    activo: true,
    puntajeMaximo: 10,

    evidenciaObligatoria: false,
    evidenciaMinima: 0,
    evidenciaMaxima: 0,
    opciones: [],
    hijos: [],
    ...parcial,
  };
}

function seccion(id: string, titulo: string, hijos: NodoArbol[]): NodoArbol {
  return {
    id, padreId: null, tipo: "PANEL", codigo: id, titulo, orden: 0, nivel: 0, activo: true,
    puntajeMaximo: 0, evidenciaObligatoria: false,
    evidenciaMinima: 0, evidenciaMaxima: 0, opciones: [], hijos,
  };
}

describe("puedeEditarRespuestas", () => {
  it("retorna true cuando estado es EN_PROGRESO (único estado posible en este sprint)", () => {
    expect(puedeEditarRespuestas({ estado: "EN_PROGRESO" })).toBe(true);
  });
});

describe("puedeFirmarse", () => {
  it("retorna true cuando estado es EN_PROGRESO y pendientesSincronizacion es 0", () => {
    expect(puedeFirmarse({ estado: "EN_PROGRESO" }, 0)).toBe(true);
  });

  it("retorna false cuando pendientesSincronizacion es mayor a 0", () => {
    expect(puedeFirmarse({ estado: "EN_PROGRESO" }, 3)).toBe(false);
  });

  it("retorna false cuando la certificación ya está FIRMADA, aunque no haya pendientes", () => {
    expect(puedeFirmarse({ estado: "FIRMADA" }, 0)).toBe(false);
  });
});

describe("puedeEjecutarCertificacion", () => {
  it("retorna false para administrador_cliente", () => {
    expect(puedeEjecutarCertificacion("administrador_cliente")).toBe(false);
  });

  it("retorna false para usuario_sucursal", () => {
    expect(puedeEjecutarCertificacion("usuario_sucursal")).toBe(false);
  });

  it("retorna true para administrador", () => {
    expect(puedeEjecutarCertificacion("administrador")).toBe(true);
  });

  it("retorna true para auditor", () => {
    expect(puedeEjecutarCertificacion("auditor")).toBe(true);
  });
});

describe("generarCodigoVerificacion", () => {
  it("genera un código de 10 caracteres alfanuméricos en mayúscula", () => {
    const codigo = generarCodigoVerificacion();
    expect(codigo).toHaveLength(10);
    expect(codigo).toMatch(/^[A-Z0-9]{10}$/);
  });

  it("genera códigos distintos en llamadas sucesivas (con probabilidad abrumadora)", () => {
    const codigos = new Set(Array.from({ length: 20 }, () => generarCodigoVerificacion()));
    expect(codigos.size).toBeGreaterThan(1);
  });
});

describe("calcularFechaVencimiento", () => {
  it("suma los meses de vigencia por defecto (12) a la fecha de firma", () => {
    const resultado = calcularFechaVencimiento(new Date("2026-07-21T00:00:00.000Z"), 12);
    expect(resultado.getUTCFullYear()).toBe(2027);
    expect(resultado.getUTCMonth()).toBe(6); // julio (0-indexado)
  });

  it("respeta una vigencia distinta a 12 meses", () => {
    const resultado = calcularFechaVencimiento(new Date("2026-07-21T00:00:00.000Z"), 6);
    expect(resultado.getUTCMonth()).toBe(0); // enero 2027
    expect(resultado.getUTCFullYear()).toBe(2027);
  });
});

describe("calcularResumen", () => {
  it("con detalles vacíos retorna puntajeObtenido 0", () => {
    expect(calcularResumen([], 100, [])).toEqual({
      puntajeObtenido: 0, puntajeMaximo: 100, porcentajeCumplimiento: 0, clasificacion: undefined,
    });
  });

  it("suma el puntaje de varias secciones y calcula el porcentaje y la clasificación correctos", () => {
    const rangos: RangoResultado[] = [
      { id: "r1", desde: 0, hasta: 59.99, clasificacion: "No aprobado", color: "red", orden: 0 },
      { id: "r2", desde: 60, hasta: 100, clasificacion: "Aprobado", color: "green", orden: 1 },
    ];
    const detalles = [
      { nodoId: "n1", puntajeObtenido: 40 },
      { nodoId: "n2", puntajeObtenido: 35 },
    ];
    expect(calcularResumen(detalles, 100, rangos)).toEqual({
      puntajeObtenido: 75, puntajeMaximo: 100, porcentajeCumplimiento: 75, clasificacion: "Aprobado",
    });
  });
});

describe("calcularResumenPorSeccion", () => {
  it("retorna [] cuando no hay secciones", () => {
    expect(calcularResumenPorSeccion([], [])).toEqual([]);
  });

  it("cuenta las preguntas respondidas de cada sección de nivel 0", () => {
    const s1 = seccion("s1", "Sección 1", [nodoPregunta({ id: "p1" }), nodoPregunta({ id: "p2" })]);
    const s2 = seccion("s2", "Sección 2", [nodoPregunta({ id: "p3" })]);
    const resultado = calcularResumenPorSeccion([s1, s2], [{ nodoId: "p1" }]);
    expect(resultado).toEqual([
      { seccionId: "s1", titulo: "Sección 1", respondidas: 1, total: 2 },
      { seccionId: "s2", titulo: "Sección 2", respondidas: 0, total: 1 },
    ]);
  });
});

describe("calcularPuntajeRespuesta", () => {
  it("SI_NO: puntaje completo si valor es SI", () => {
    const nodo = nodoPregunta({ tipoRespuesta: "SI_NO", puntajeMaximo: 10 });
    expect(calcularPuntajeRespuesta(nodo, "SI")).toBe(10);
    expect(calcularPuntajeRespuesta(nodo, "NO")).toBe(0);
  });

  it("POR_OPCIONES: suma el puntaje de las opciones seleccionadas", () => {
    const nodo = nodoPregunta({
      modalidadPuntaje: "POR_OPCIONES",
      puntajeMaximo: 10,
      opciones: [{ id: "o1", etiqueta: "A", puntaje: 4, orden: 0 }, { id: "o2", etiqueta: "B", puntaje: 3, orden: 1 }],
    });
    expect(calcularPuntajeRespuesta(nodo, undefined, ["o1", "o2"])).toBe(7);
  });

  it("MANUAL: acota el número ingresado a puntajeMaximo, nunca negativo", () => {
    const nodo = nodoPregunta({ modalidadPuntaje: "MANUAL", puntajeMaximo: 10 });
    expect(calcularPuntajeRespuesta(nodo, "8")).toBe(8);
    expect(calcularPuntajeRespuesta(nodo, "20")).toBe(10);
    expect(calcularPuntajeRespuesta(nodo, "-5")).toBe(0);
  });
});
