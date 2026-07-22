import type { AlcanceUsuarioReporte } from "../../domain/reporte.entity";
import { AccesoModuloReportesDenegadoError, ReporteNoEncontradoError } from "../../domain/reporte.errors";
import type { FiltrosHistorial, ReporteRepositoryPort } from "../../domain/reporte.repository.port";

export class ListarHistorialReportesUseCase {
  constructor(private readonly repo: ReporteRepositoryPort) {}

  listar(
    empresaId: string,
    alcance: AlcanceUsuarioReporte,
    filtros: FiltrosHistorial,
    paginacion?: { pagina?: number; porPagina?: number },
  ) {
    if (alcance.tipo === "SUCURSAL") throw new AccesoModuloReportesDenegadoError();

    const filtrosConAlcance: FiltrosHistorial = alcance.tipo === "CLIENTE"
      ? { ...filtros, clienteId: alcance.clienteId }
      : filtros;

    return this.repo.listarHistorial(empresaId, filtrosConAlcance, {
      pagina: paginacion?.pagina ?? 1,
      porPagina: paginacion?.porPagina ?? 20,
    });
  }

  async obtenerParaDescarga(id: string, empresaId: string, alcance: AlcanceUsuarioReporte) {
    const reporte = await this.repo.obtenerPorId(id, empresaId);
    if (!reporte) throw new ReporteNoEncontradoError();
    if (alcance.tipo === "CLIENTE" && reporte.filtros.clienteId !== alcance.clienteId) {
      throw new ReporteNoEncontradoError();
    }
    if (alcance.tipo === "SUCURSAL") throw new ReporteNoEncontradoError();
    return reporte.url;
  }
}
