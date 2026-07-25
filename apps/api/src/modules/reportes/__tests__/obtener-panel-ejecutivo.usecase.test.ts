import { describe, it, expect, vi } from "vitest";
import { ObtenerPanelEjecutivoUseCase } from "../application/casos-uso/obtener-panel-ejecutivo.usecase";
import { AccesoModuloReportesDenegadoError } from "../domain/reporte.errors";

function datosCrudos() {
  return {
    totalSucursales: 4,
    sucursalesVigentes: 3,
    certificacionesPorVencer: [],
    hallazgosCriticosAbiertos: 2,
    accionesVencidas: [],
  };
}

describe("ObtenerPanelEjecutivoUseCase", () => {
  it("alcance SUCURSAL lanza AccesoModuloReportesDenegadoError", async () => {
    const repo = { obtenerPanelEjecutivo: vi.fn() } as any;
    const uc = new ObtenerPanelEjecutivoUseCase(repo);

    await expect(uc.ejecutar("e1", { tipo: "SUCURSAL", sucursalIds: [] }, {})).rejects.toThrow(AccesoModuloReportesDenegadoError);
    expect(repo.obtenerPanelEjecutivo).not.toHaveBeenCalled();
  });

  it("alcance CLIENTE fuerza su propio clienteId, ignorando el query param", async () => {
    const repo = { obtenerPanelEjecutivo: vi.fn().mockResolvedValue(datosCrudos()) } as any;
    const uc = new ObtenerPanelEjecutivoUseCase(repo);

    await uc.ejecutar("e1", { tipo: "CLIENTE", clienteId: "propio" }, { clienteId: "otro" });

    expect(repo.obtenerPanelEjecutivo).toHaveBeenCalledWith("e1", "propio");
  });

  it("alcance TOTAL usa el clienteId del query param si viene", async () => {
    const repo = { obtenerPanelEjecutivo: vi.fn().mockResolvedValue(datosCrudos()) } as any;
    const uc = new ObtenerPanelEjecutivoUseCase(repo);

    await uc.ejecutar("e1", { tipo: "TOTAL" }, { clienteId: "c1" });

    expect(repo.obtenerPanelEjecutivo).toHaveBeenCalledWith("e1", "c1");
  });

  it("arma el PanelEjecutivo combinando los agregados crudos", async () => {
    const repo = { obtenerPanelEjecutivo: vi.fn().mockResolvedValue(datosCrudos()) } as any;
    const uc = new ObtenerPanelEjecutivoUseCase(repo);

    const panel = await uc.ejecutar("e1", { tipo: "TOTAL" }, {});

    expect(panel).toEqual({
      pctSucursalesVigentes: 75,
      certificacionesPorVencer30d: 0,
      hallazgosCriticosAbiertos: 2,
      accionesVencidas: 0,
      atencionRequerida: [],
    });
  });
});
