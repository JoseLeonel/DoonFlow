import { puedeGenerarReporte, type AlcanceUsuarioReporte } from "../../domain/reporte.entity";
import { AccesoModuloReportesDenegadoError, ClienteFueraDeAlcanceError } from "../../domain/reporte.errors";
import type { ReporteRepositoryPort } from "../../domain/reporte.repository.port";
import type { GeneradorExcelPort } from "../../domain/generador-excel.port";
import type { GeneradorPdfPort } from "../../domain/generador-pdf.port";
import type { ReporteStoragePort } from "../../domain/reporte-storage.port";
import type { GenerarReporteInput } from "../reporte.schema";

export class GenerarReporteUseCase {
  constructor(
    private readonly repo: ReporteRepositoryPort,
    private readonly generadorExcel: GeneradorExcelPort,
    private readonly generadorPdf: GeneradorPdfPort,
    private readonly storage: ReporteStoragePort,
  ) {}

  async generar(empresaId: string, usuarioId: string, alcance: AlcanceUsuarioReporte, input: GenerarReporteInput) {
    this.validarAcceso(alcance, input.clienteId);

    const datosReporte = await this.obtenerDatos(empresaId, input);
    const buffer = input.formato === "EXCEL"
      ? await this.generadorExcel.generar(datosReporte)
      : await this.generadorPdf.generar(datosReporte);

    const extension = input.formato === "EXCEL" ? "xlsx" : "pdf";
    const nombreArchivo = `reporte-${input.tipo.toLowerCase().replace(/_/g, "-")}-${Date.now()}.${extension}`;
    const contentType = input.formato === "EXCEL"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "application/pdf";

    const reporteId = crypto.randomUUID();
    const url = await this.storage.subir(buffer, `reportes/${empresaId}/${reporteId}/${nombreArchivo}`, contentType);

    const reporte = await this.repo.crear({
      empresaId,
      tipo: input.tipo,
      filtros: {
        clienteId: input.clienteId,
        sucursalIds: input.sucursalIds,
        fechaDesde: input.fechaDesde,
        fechaHasta: input.fechaHasta,
      },
      formato: input.formato,
      url,
      generadoPorId: usuarioId,
    });

    return { reporte, urlDescarga: url };
  }

  async obtenerPreviewConsolidado(empresaId: string, alcance: AlcanceUsuarioReporte, clienteId: string, fechaDesde: string, fechaHasta: string) {
    this.validarAcceso(alcance, clienteId);
    return this.repo.obtenerDatosConsolidadoCliente(empresaId, clienteId, fechaDesde, fechaHasta);
  }

  async obtenerPreviewComparativo(
    empresaId: string,
    alcance: AlcanceUsuarioReporte,
    clienteId: string,
    sucursalIds: string[],
    fechaDesde: string,
    fechaHasta: string,
  ) {
    this.validarAcceso(alcance, clienteId);
    return this.repo.obtenerDatosComparativoSucursales(empresaId, clienteId, sucursalIds, fechaDesde, fechaHasta);
  }

  private validarAcceso(alcance: AlcanceUsuarioReporte, clienteId: string) {
    if (alcance.tipo === "SUCURSAL") throw new AccesoModuloReportesDenegadoError();
    if (!puedeGenerarReporte(alcance, clienteId)) throw new ClienteFueraDeAlcanceError();
  }

  private async obtenerDatos(empresaId: string, input: GenerarReporteInput) {
    if (input.tipo === "CONSOLIDADO_CLIENTE") {
      const datos = await this.repo.obtenerDatosConsolidadoCliente(empresaId, input.clienteId, input.fechaDesde, input.fechaHasta);
      return { tipo: "CONSOLIDADO_CLIENTE" as const, datos };
    }
    const datos = await this.repo.obtenerDatosComparativoSucursales(
      empresaId, input.clienteId, input.sucursalIds ?? [], input.fechaDesde, input.fechaHasta,
    );
    return { tipo: "COMPARATIVO_SUCURSALES" as const, datos };
  }
}
