import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { GenerarReporteUseCase } from "../application/casos-uso/generar-reporte.usecase";
import { AccesoModuloReportesDenegadoError, ClienteFueraDeAlcanceError } from "../domain/reporte.errors";
import type { ReporteRepositoryPort } from "../domain/reporte.repository.port";
import type { GeneradorExcelPort } from "../domain/generador-excel.port";
import type { GeneradorPdfPort } from "../domain/generador-pdf.port";
import type { ReporteStoragePort } from "../domain/reporte-storage.port";
import type { GenerarReporteInput } from "../application/reporte.schema";

function crearRepoMock(): ReporteRepositoryPort & Record<string, Mock> {
  return {
    listarHistorial: vi.fn(),
    crear: vi.fn(),
    obtenerPorId: vi.fn(),
    obtenerDatosConsolidadoCliente: vi.fn(),
    obtenerDatosComparativoSucursales: vi.fn(),
  } as unknown as ReporteRepositoryPort & Record<string, Mock>;
}

const inputBase: GenerarReporteInput = {
  tipo: "CONSOLIDADO_CLIENTE",
  formato: "PDF",
  clienteId: "c1",
  fechaDesde: "2026-06-01",
  fechaHasta: "2026-06-30",
};

const datosConsolidado = {
  clienteId: "c1",
  clienteNombre: "Distribuidora Sur S.A.",
  periodo: { fechaDesde: "2026-06-01", fechaHasta: "2026-06-30" },
  sucursales: [],
};

describe("GenerarReporteUseCase", () => {
  let repo: ReturnType<typeof crearRepoMock>;
  let generadorExcel: GeneradorExcelPort & { generar: Mock };
  let generadorPdf: GeneradorPdfPort & { generar: Mock };
  let storage: ReporteStoragePort & { subir: Mock };
  let uc: GenerarReporteUseCase;

  beforeEach(() => {
    repo = crearRepoMock();
    repo.obtenerDatosConsolidadoCliente.mockResolvedValue(datosConsolidado);
    repo.crear.mockImplementation((datos: any) => Promise.resolve({ id: "r1", empresaId: "e1", ...datos }));

    generadorExcel = { generar: vi.fn().mockResolvedValue(Buffer.from("excel")) };
    generadorPdf = { generar: vi.fn().mockResolvedValue(Buffer.from("pdf")) };
    storage = { subir: vi.fn().mockResolvedValue("https://storage/reporte.pdf") };

    uc = new GenerarReporteUseCase(repo, generadorExcel, generadorPdf, storage);
  });

  it("lanza ClienteFueraDeAlcanceError si administrador_cliente solicita un clienteId distinto al suyo", async () => {
    await expect(
      uc.generar("e1", "u1", { tipo: "CLIENTE", clienteId: "otro" }, inputBase),
    ).rejects.toThrow(ClienteFueraDeAlcanceError);
  });

  it("lanza AccesoModuloReportesDenegadoError si el alcance es SUCURSAL (usuario_sucursal)", async () => {
    await expect(
      uc.generar("e1", "u1", { tipo: "SUCURSAL", sucursalIds: [] }, inputBase),
    ).rejects.toThrow(AccesoModuloReportesDenegadoError);
  });

  it("con formato EXCEL llama GeneradorExcelPort.generar() y no llama al de PDF", async () => {
    await uc.generar("e1", "u1", { tipo: "TOTAL" }, { ...inputBase, formato: "EXCEL" });

    expect(generadorExcel.generar).toHaveBeenCalledTimes(1);
    expect(generadorPdf.generar).not.toHaveBeenCalled();
  });

  it("con formato PDF llama GeneradorPdfPort.generar() y no llama al de Excel", async () => {
    await uc.generar("e1", "u1", { tipo: "TOTAL" }, { ...inputBase, formato: "PDF" });

    expect(generadorPdf.generar).toHaveBeenCalledTimes(1);
    expect(generadorExcel.generar).not.toHaveBeenCalled();
  });

  it("guarda filtros como snapshot exacto del input recibido", async () => {
    await uc.generar("e1", "u1", { tipo: "TOTAL" }, inputBase);

    expect(repo.crear).toHaveBeenCalledWith(expect.objectContaining({
      filtros: { clienteId: "c1", sucursalIds: undefined, fechaDesde: "2026-06-01", fechaHasta: "2026-06-30" },
    }));
  });

  it("retorna { reporte, urlDescarga } con la url que devuelve ReporteStoragePort", async () => {
    const resultado = await uc.generar("e1", "u1", { tipo: "TOTAL" }, inputBase);

    expect(resultado.urlDescarga).toBe("https://storage/reporte.pdf");
    expect(resultado.reporte.url).toBe("https://storage/reporte.pdf");
  });

  it("obtenerPreviewComparativo() no genera archivo ni llama a los puertos de Excel/PDF", async () => {
    repo.obtenerDatosComparativoSucursales.mockResolvedValue({ clienteId: "c1", clienteNombre: "X", periodo: { fechaDesde: "", fechaHasta: "" }, filas: [] });

    await uc.obtenerPreviewComparativo("e1", { tipo: "TOTAL" }, "c1", ["s1"], "2026-06-01", "2026-06-30");

    expect(generadorExcel.generar).not.toHaveBeenCalled();
    expect(generadorPdf.generar).not.toHaveBeenCalled();
    expect(storage.subir).not.toHaveBeenCalled();
  });
});
