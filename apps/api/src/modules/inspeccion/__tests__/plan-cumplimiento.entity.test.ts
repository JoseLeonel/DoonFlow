import { describe, it, expect } from "vitest";
import { calcularIndicadores, puedeCerrarse, puedeGenerarse } from "../domain/plan-cumplimiento.entity";
import type { AccionCorrectiva } from "../domain/accion-correctiva.entity";

function accion(parcial: Partial<AccionCorrectiva> = {}): AccionCorrectiva {
  return {
    id: "a1", planCumplimientoId: "plan1", hallazgoId: "h1", descripcion: "Acción",
    responsableId: "u1", fechaLimite: new Date("2030-01-01"), estado: "PENDIENTE",
    porcentajeAvance: 0, verificadoPorId: null, verificadoEn: null, comentarioVerificacion: null,
    creadoEn: new Date(), actualizadoEn: new Date(),
    ...parcial,
  };
}

describe("puedeGenerarse", () => {
  it("sin hallazgos retorna false", () => {
    expect(puedeGenerarse([])).toBe(false);
  });

  it("con al menos un hallazgo retorna true", () => {
    expect(puedeGenerarse([{ id: "h1" }])).toBe(true);
  });
});

describe("puedeCerrarse", () => {
  it("con un hallazgo sin ninguna acción CUMPLIDO retorna false", () => {
    const hallazgos = [{ id: "h1" }];
    const acciones = [accion({ hallazgoId: "h1", estado: "EN_PROCESO" })];
    expect(puedeCerrarse(hallazgos, acciones)).toBe(false);
  });

  it("con todos los hallazgos cubiertos por al menos una acción CUMPLIDO retorna true", () => {
    const hallazgos = [{ id: "h1" }, { id: "h2" }];
    const acciones = [
      accion({ hallazgoId: "h1", estado: "CUMPLIDO" }),
      accion({ id: "a2", hallazgoId: "h2", estado: "CUMPLIDO" }),
    ];
    expect(puedeCerrarse(hallazgos, acciones)).toBe(true);
  });
});

describe("calcularIndicadores", () => {
  const ahora = new Date("2026-07-22T00:00:00Z");

  it("con [] retorna todos los indicadores en 0", () => {
    expect(calcularIndicadores([], ahora)).toEqual({
      total: 0, pendientes: 0, enProceso: 0, enRevision: 0, cumplidas: 0,
      noCumplidas: 0, vencidas: 0, porcentajeCumplimiento: 0, proximasAVencer: 0,
    });
  });

  it("calcula el porcentaje de cumplimiento y cuenta vencidas correctamente", () => {
    const acciones = [
      accion({ id: "a1", estado: "CUMPLIDO", fechaLimite: new Date("2026-01-01") }),
      accion({ id: "a2", estado: "PENDIENTE", fechaLimite: new Date("2020-01-01") }), // vencida
      accion({ id: "a3", estado: "EN_PROCESO", fechaLimite: new Date("2026-07-25") }), // próxima a vencer
    ];

    const indicadores = calcularIndicadores(acciones, ahora);

    expect(indicadores.total).toBe(3);
    expect(indicadores.cumplidas).toBe(1);
    expect(indicadores.vencidas).toBe(1);
    expect(indicadores.proximasAVencer).toBe(1);
    expect(indicadores.porcentajeCumplimiento).toBeCloseTo(33.33, 1);
  });
});
