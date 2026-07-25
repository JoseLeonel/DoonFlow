import { calcularPctSucursalesVigentes, construirAtencionRequerida } from "../../domain/reporte.entity";
import type { AlcanceUsuarioReporte, PanelEjecutivo } from "../../domain/reporte.entity";
import { AccesoModuloReportesDenegadoError } from "../../domain/reporte.errors";
import type { ReporteRepositoryPort } from "../../domain/reporte.repository.port";

/**
 * Panel ejecutivo (014-panel-calendario-biblioteca, HU-4): indicadores agregados de
 * cumplimiento por empresa tenant, filtrables por cliente. Mismo criterio de alcance que el
 * historial de reportes (008): un `administrador_cliente` siempre ve solo su cliente,
 * ignorando el query param; `usuario_sucursal` no tiene acceso al módulo de reportes.
 */
export class ObtenerPanelEjecutivoUseCase {
  constructor(private readonly repo: ReporteRepositoryPort) {}

  async ejecutar(empresaId: string, alcance: AlcanceUsuarioReporte, filtros: { clienteId?: string }): Promise<PanelEjecutivo> {
    if (alcance.tipo === "SUCURSAL") throw new AccesoModuloReportesDenegadoError();

    const clienteId = alcance.tipo === "CLIENTE" ? alcance.clienteId : filtros.clienteId;
    const crudo = await this.repo.obtenerPanelEjecutivo(empresaId, clienteId);

    return {
      pctSucursalesVigentes: calcularPctSucursalesVigentes(crudo.sucursalesVigentes, crudo.totalSucursales),
      certificacionesPorVencer30d: crudo.certificacionesPorVencer.length,
      hallazgosCriticosAbiertos: crudo.hallazgosCriticosAbiertos,
      accionesVencidas: crudo.accionesVencidas.length,
      atencionRequerida: construirAtencionRequerida(crudo),
    };
  }
}
