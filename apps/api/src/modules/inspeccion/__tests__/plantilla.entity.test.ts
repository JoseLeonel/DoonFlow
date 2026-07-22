import { describe, it, expect } from "vitest";
import {
  puedeIniciarInspeccion,
  puedeEnviarseARevision,
  puedeAprobarse,
  puedeRechazarse,
  debeRevertirABorrador,
  validarRangos,
  contarPreguntas,
  sumarPuntajes,
  type Plantilla,
  type NodoArbol,
  type RangoResultado,
} from "../domain/plantilla.entity";

// ── Fábricas de datos de prueba ────────────────────────────────────────────────

function plantilla(parcial: Partial<Plantilla> = {}): Plantilla {
  return {
    id: "p1",
    empresaId: "e1",
    nombre: "Ficha Calidad 2026",
    tipo: "CALIDAD",
    activa: true,
    puntajeMaximo: 100,
    version: 1,
    creadoEn: new Date("2026-01-01T00:00:00Z"),
    actualizadoEn: new Date("2026-01-01T00:00:00Z"),
    estadoAprobacion: "APROBADA",
    ...parcial,
  };
}

function pregunta(parcial: Partial<NodoArbol> = {}): NodoArbol {
  return {
    id: "n1",
    padreId: null,
    tipo: "PREGUNTA",
    codigo: "P1",
    titulo: "¿Cumple el requisito?",
    orden: 0,
    nivel: 1,
    activo: true,
    puntajeMaximo: 10,
    reglaComentario: "NUNCA",
    evidenciaObligatoria: false,
    evidenciaMinima: 0,
    evidenciaMaxima: 5,
    opciones: [],
    hijos: [],
    ...parcial,
  };
}

function panel(parcial: Partial<NodoArbol> = {}): NodoArbol {
  return {
    id: "s1",
    padreId: null,
    tipo: "PANEL",
    codigo: "S1",
    titulo: "Sección 1",
    orden: 0,
    nivel: 0,
    activo: true,
    puntajeMaximo: 0,
    reglaComentario: "NUNCA",
    evidenciaObligatoria: false,
    evidenciaMinima: 0,
    evidenciaMaxima: 0,
    opciones: [],
    hijos: [],
    ...parcial,
  };
}

function rango(parcial: Partial<RangoResultado> = {}): RangoResultado {
  return {
    id: "r1",
    desde: 0,
    hasta: 100,
    clasificacion: "Aprobado",
    color: "green",
    orden: 0,
    ...parcial,
  };
}

// ── puedeIniciarInspeccion ─────────────────────────────────────────────────────

describe("puedeIniciarInspeccion", () => {
  it("retorna true cuando la plantilla está activa y sin fecha de vigencia", () => {
    expect(puedeIniciarInspeccion(plantilla())).toBe(true);
  });

  it("retorna false cuando la plantilla está inactiva", () => {
    expect(puedeIniciarInspeccion(plantilla({ activa: false }))).toBe(false);
  });

  it("retorna false cuando la fecha de vigencia ya expiró", () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    expect(puedeIniciarInspeccion(plantilla({ fechaVigencia: ayer }))).toBe(false);
  });

  it("retorna true cuando la fecha de vigencia es hoy o en el futuro", () => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    expect(puedeIniciarInspeccion(plantilla({ fechaVigencia: manana }))).toBe(true);
  });

  it("retorna false si la plantilla está activa y vigente pero no aprobada (007)", () => {
    expect(puedeIniciarInspeccion(plantilla({ estadoAprobacion: "BORRADOR" }))).toBe(false);
  });
});

// ── Aprobación de plantillas (007-gobernanza-permisos-aprobacion) ──────────────

describe("puedeEnviarseARevision", () => {
  it("BORRADOR con preguntas → true", () => {
    expect(puedeEnviarseARevision({ estadoAprobacion: "BORRADOR" }, 5)).toBe(true);
  });
  it("BORRADOR sin preguntas → false", () => {
    expect(puedeEnviarseARevision({ estadoAprobacion: "BORRADOR" }, 0)).toBe(false);
  });
  it("EN_REVISION → false", () => {
    expect(puedeEnviarseARevision({ estadoAprobacion: "EN_REVISION" }, 5)).toBe(false);
  });
});

describe("puedeAprobarse", () => {
  it("EN_REVISION → true", () => {
    expect(puedeAprobarse({ estadoAprobacion: "EN_REVISION" })).toBe(true);
  });
  it("cualquier otro estado → false", () => {
    expect(puedeAprobarse({ estadoAprobacion: "BORRADOR" })).toBe(false);
    expect(puedeAprobarse({ estadoAprobacion: "APROBADA" })).toBe(false);
    expect(puedeAprobarse({ estadoAprobacion: "RECHAZADA" })).toBe(false);
  });
});

describe("puedeRechazarse", () => {
  it("EN_REVISION con comentario no vacío → true", () => {
    expect(puedeRechazarse({ estadoAprobacion: "EN_REVISION" }, "Faltan preguntas")).toBe(true);
  });
  it("EN_REVISION con comentario vacío/undefined → false", () => {
    expect(puedeRechazarse({ estadoAprobacion: "EN_REVISION" }, "")).toBe(false);
    expect(puedeRechazarse({ estadoAprobacion: "EN_REVISION" }, undefined)).toBe(false);
    expect(puedeRechazarse({ estadoAprobacion: "EN_REVISION" }, "   ")).toBe(false);
  });
  it("BORRADOR → false", () => {
    expect(puedeRechazarse({ estadoAprobacion: "BORRADOR" }, "comentario")).toBe(false);
  });
});

describe("debeRevertirABorrador", () => {
  it("APROBADA → true", () => expect(debeRevertirABorrador("APROBADA")).toBe(true));
  it("RECHAZADA → true", () => expect(debeRevertirABorrador("RECHAZADA")).toBe(true));
  it("BORRADOR → false", () => expect(debeRevertirABorrador("BORRADOR")).toBe(false));
  it("EN_REVISION → false", () => expect(debeRevertirABorrador("EN_REVISION")).toBe(false));
});

// ── validarRangos ──────────────────────────────────────────────────────────────

describe("validarRangos", () => {
  it("retorna null cuando no hay rangos", () => {
    expect(validarRangos([])).toBeNull();
  });

  it("retorna null con un único rango válido", () => {
    expect(validarRangos([rango()])).toBeNull();
  });

  it("retorna null con rangos consecutivos sin solapamiento", () => {
    const rangos: RangoResultado[] = [
      rango({ id: "r1", desde: 0,  hasta: 59,  clasificacion: "Reprobado", orden: 0 }),
      rango({ id: "r2", desde: 60, hasta: 79,  clasificacion: "Regular",   orden: 1 }),
      rango({ id: "r3", desde: 80, hasta: 100, clasificacion: "Aprobado",  orden: 2 }),
    ];
    expect(validarRangos(rangos)).toBeNull();
  });

  it("retorna mensaje de error cuando dos rangos se solapan", () => {
    const rangos: RangoResultado[] = [
      rango({ id: "r1", desde: 0,  hasta: 70, clasificacion: "A", orden: 0 }),
      rango({ id: "r2", desde: 60, hasta: 100, clasificacion: "B", orden: 1 }),
    ];
    const error = validarRangos(rangos);
    expect(error).not.toBeNull();
    expect(error).toContain("A");
    expect(error).toContain("B");
  });

  it("detecta solapamiento incluso cuando los rangos llegan desordenados", () => {
    const rangos: RangoResultado[] = [
      rango({ id: "r2", desde: 60, hasta: 100, clasificacion: "B", orden: 1 }),
      rango({ id: "r1", desde: 0,  hasta: 70,  clasificacion: "A", orden: 0 }),
    ];
    expect(validarRangos(rangos)).not.toBeNull();
  });
});

// ── contarPreguntas ────────────────────────────────────────────────────────────

describe("contarPreguntas", () => {
  it("retorna 0 para un árbol vacío", () => {
    expect(contarPreguntas([])).toBe(0);
  });

  it("cuenta una sola pregunta en raíz", () => {
    expect(contarPreguntas([pregunta()])).toBe(1);
  });

  it("no cuenta paneles como preguntas", () => {
    expect(contarPreguntas([panel()])).toBe(0);
  });

  it("cuenta recursivamente las preguntas dentro de paneles anidados", () => {
    const arbol: NodoArbol[] = [
      panel({
        id: "s1",
        hijos: [
          pregunta({ id: "p1", padreId: "s1" }),
          pregunta({ id: "p2", padreId: "s1" }),
          panel({
            id: "s2",
            padreId: "s1",
            nivel: 1,
            hijos: [
              pregunta({ id: "p3", padreId: "s2", nivel: 2 }),
            ],
          }),
        ],
      }),
    ];
    expect(contarPreguntas(arbol)).toBe(3);
  });
});

// ── sumarPuntajes ──────────────────────────────────────────────────────────────

describe("sumarPuntajes", () => {
  it("retorna 0 para un árbol vacío", () => {
    expect(sumarPuntajes([])).toBe(0);
  });

  it("suma el puntaje de una sola pregunta", () => {
    expect(sumarPuntajes([pregunta({ puntajeMaximo: 25 })])).toBe(25);
  });

  it("ignora el puntajeMaximo de los paneles", () => {
    const arbol: NodoArbol[] = [panel({ puntajeMaximo: 999, hijos: [] })];
    expect(sumarPuntajes(arbol)).toBe(0);
  });

  it("suma recursivamente los puntajes de todas las preguntas", () => {
    const arbol: NodoArbol[] = [
      panel({
        id: "s1",
        hijos: [
          pregunta({ id: "p1", padreId: "s1", puntajeMaximo: 40 }),
          pregunta({ id: "p2", padreId: "s1", puntajeMaximo: 30 }),
          panel({
            id: "s2",
            padreId: "s1",
            nivel: 1,
            hijos: [
              pregunta({ id: "p3", padreId: "s2", nivel: 2, puntajeMaximo: 30 }),
            ],
          }),
        ],
      }),
    ];
    expect(sumarPuntajes(arbol)).toBe(100);
  });

  it("suma múltiples paneles raíz correctamente", () => {
    const arbol: NodoArbol[] = [
      panel({ id: "s1", hijos: [pregunta({ id: "p1", puntajeMaximo: 50 })] }),
      panel({ id: "s2", hijos: [pregunta({ id: "p2", puntajeMaximo: 50 })] }),
    ];
    expect(sumarPuntajes(arbol)).toBe(100);
  });
});
