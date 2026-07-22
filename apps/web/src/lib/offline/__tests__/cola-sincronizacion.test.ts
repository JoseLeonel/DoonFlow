import { describe, it, expect, vi, beforeAll } from "vitest";
import { procesarColaSincronizacion, marcarModificacionLocal, calcularBackoff, _establecerBackoffBaseMsParaTests } from "../cola-sincronizacion";
import type { ClienteSincronizacion } from "../cola-sincronizacion";
import { guardarRespuestaLocal, listarRespuestasPendientes } from "../respuestas-offline.store";
import { guardarEvidenciaLocal, listarEvidenciasPendientes } from "../evidencias-offline.store";

function archivoNoImagen(nombre = "criterio.pdf") {
  return new File(["contenido"], nombre, { type: "application/pdf" });
}

describe("calcularBackoff", () => {
  it("crece exponencialmente (base configurable)", () => {
    _establecerBackoffBaseMsParaTests(2000);
    expect(calcularBackoff(1)).toBe(2000);
    expect(calcularBackoff(2)).toBe(4000);
    expect(calcularBackoff(3)).toBe(8000);
  });
});

describe("procesarColaSincronizacion", () => {
  // Backoff real pero de milisegundos — evita esperar decenas de segundos en el test
  // sin mezclar fake timers con fake-indexeddb (interacción frágil entre ambos).
  beforeAll(() => { _establecerBackoffBaseMsParaTests(1); });

  it("reintenta con backoff cuando la llamada de red falla las primeras veces y luego tiene éxito", async () => {
    const inspeccionId = "insp-reintentos";
    await guardarRespuestaLocal({ inspeccionId, nodoId: "n1", valor: "SI" });
    await marcarModificacionLocal(inspeccionId);

    let intentos = 0;
    const cliente: ClienteSincronizacion = {
      sincronizarLote: vi.fn().mockImplementation(async () => {
        intentos++;
        if (intentos < 3) throw new Error("red caída");
        return { procesadas: 1 };
      }),
      subirEvidencia: vi.fn(),
    };

    const resultado = await procesarColaSincronizacion(inspeccionId, cliente);

    expect(intentos).toBe(3);
    expect(resultado.respuestasProcesadas).toBe(1);
    expect(await listarRespuestasPendientes(inspeccionId)).toHaveLength(0);
  });

  it("si una evidencia falla tras agotar reintentos, las respuestas y evidencias ya enviadas quedan marcadas como sincronizadas", async () => {
    const inspeccionId = "insp-fallo-parcial";
    await guardarRespuestaLocal({ inspeccionId, nodoId: "n1", valor: "SI" });
    await guardarEvidenciaLocal(inspeccionId, "n1", archivoNoImagen());
    await marcarModificacionLocal(inspeccionId);

    const cliente: ClienteSincronizacion = {
      sincronizarLote: vi.fn().mockResolvedValue({ procesadas: 1 }),
      subirEvidencia: vi.fn().mockRejectedValue(new Error("servidor caído")),
    };

    const resultado = await procesarColaSincronizacion(inspeccionId, cliente);

    expect(resultado.exitoTotal).toBe(false);
    expect(resultado.evidenciasFallidas).toBe(1);
    // La respuesta sí se sincronizó — no se pierde ni se revierte por la falla de la evidencia.
    expect(await listarRespuestasPendientes(inspeccionId)).toHaveLength(0);
    // La evidencia queda marcada con error, sigue "pendiente" para reintentar más tarde.
    expect(await listarEvidenciasPendientes(inspeccionId)).toHaveLength(1);
  }, 10000);

  it("procesa todas las respuestas antes que las evidencias dentro de la misma corrida", async () => {
    const inspeccionId = "insp-orden";
    await guardarRespuestaLocal({ inspeccionId, nodoId: "n1", valor: "SI" });
    await guardarEvidenciaLocal(inspeccionId, "n1", archivoNoImagen());
    await marcarModificacionLocal(inspeccionId);

    const orden: string[] = [];
    const cliente: ClienteSincronizacion = {
      sincronizarLote: vi.fn().mockImplementation(async () => { orden.push("RESPUESTA"); return { procesadas: 1 }; }),
      subirEvidencia: vi.fn().mockImplementation(async () => { orden.push("EVIDENCIA"); }),
    };

    await procesarColaSincronizacion(inspeccionId, cliente);

    expect(orden).toEqual(["RESPUESTA", "EVIDENCIA"]);
  });
});
