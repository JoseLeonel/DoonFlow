import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mocked } from "vitest";
import { ListarHistorialReportesUseCase } from "../application/casos-uso/listar-historial-reportes.usecase";
import { AccesoModuloReportesDenegadoError, ReporteNoEncontradoError } from "../domain/reporte.errors";
import type { ReporteRepositoryPort } from "../domain/reporte.repository.port";

function crearRepoMock(): Mocked<ReporteRepositoryPort> {
  return {
    listarHistorial: vi.fn(),
    crear: vi.fn(),
    obtenerPorId: vi.fn(),
    obtenerDatosConsolidadoCliente: vi.fn(),
    obtenerDatosComparativoSucursales: vi.fn(),
    obtenerPanelEjecutivo: vi.fn(),
  };
}

describe("ListarHistorialReportesUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let uc: ListarHistorialReportesUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    repo.listarHistorial.mockResolvedValue({ items: [], total: 0 });
    uc = new ListarHistorialReportesUseCase(repo);
  });

  it("filtra por clienteId propio cuando el alcance es CLIENTE (administrador_cliente)", async () => {
    await uc.listar("e1", { tipo: "CLIENTE", clienteId: "c1" }, {});

    expect(repo.listarHistorial).toHaveBeenCalledWith("e1", { clienteId: "c1" }, { pagina: 1, porPagina: 20 });
  });

  it("lanza AccesoModuloReportesDenegadoError si el alcance es SUCURSAL", async () => {
    expect(() => uc.listar("e1", { tipo: "SUCURSAL", sucursalIds: [] }, {})).toThrow(AccesoModuloReportesDenegadoError);
    expect(repo.listarHistorial).not.toHaveBeenCalled();
  });

  it("obtenerParaDescarga() lanza ReporteNoEncontradoError si el reporte pertenece a otro cliente fuera del alcance", async () => {
    repo.obtenerPorId.mockResolvedValue({
      id: "r1", empresaId: "e1", tipo: "CONSOLIDADO_CLIENTE",
      filtros: { clienteId: "otro-cliente", fechaDesde: "2026-06-01", fechaHasta: "2026-06-30" },
      formato: "PDF", url: "https://x", generadoPorId: "u1", creadoEn: new Date(),
    });

    await expect(
      uc.obtenerParaDescarga("r1", "e1", { tipo: "CLIENTE", clienteId: "c1" }),
    ).rejects.toThrow(ReporteNoEncontradoError);
  });

  it("obtenerParaDescarga() retorna la url si el reporte pertenece al cliente del alcance", async () => {
    repo.obtenerPorId.mockResolvedValue({
      id: "r1", empresaId: "e1", tipo: "CONSOLIDADO_CLIENTE",
      filtros: { clienteId: "c1", fechaDesde: "2026-06-01", fechaHasta: "2026-06-30" },
      formato: "PDF", url: "https://x/reporte.pdf", generadoPorId: "u1", creadoEn: new Date(),
    });

    const url = await uc.obtenerParaDescarga("r1", "e1", { tipo: "CLIENTE", clienteId: "c1" });

    expect(url).toBe("https://x/reporte.pdf");
  });
});
