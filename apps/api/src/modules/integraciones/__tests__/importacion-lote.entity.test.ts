import { describe, it, expect } from "vitest";
import { construirResumenLote } from "../domain/importacion-lote.entity";

describe("construirResumenLote", () => {
  it("con 3 filas exitosas y 2 con error calcula los totales correctos", () => {
    const resumen = construirResumenLote("CLIENTE", "clientes.xlsx", [
      { fila: 2, datos: {} },
      { fila: 3, datos: {} },
      { fila: 4, datos: {}, error: "correo inválido" },
      { fila: 5, datos: {} },
      { fila: 6, datos: {}, error: "identificación duplicada" },
    ]);

    expect(resumen.totalFilas).toBe(5);
    expect(resumen.filasExitosas).toBe(3);
    expect(resumen.filasConError).toBe(2);
    expect(resumen.detalleErrores).toHaveLength(2);
    expect(resumen.detalleErrores?.map((f) => f.fila)).toEqual([4, 6]);
  });

  it("con arreglo vacío retorna totalFilas 0 sin lanzar error", () => {
    const resumen = construirResumenLote("SUCURSAL", "sucursales.xlsx", []);

    expect(resumen.totalFilas).toBe(0);
    expect(resumen.filasExitosas).toBe(0);
    expect(resumen.filasConError).toBe(0);
    expect(resumen.detalleErrores).toBeNull();
  });

  it("sin ninguna fila con error, detalleErrores queda null (no arreglo vacío)", () => {
    const resumen = construirResumenLote("CLIENTE", "clientes.xlsx", [{ fila: 2, datos: {} }]);
    expect(resumen.detalleErrores).toBeNull();
  });
});
