import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import {
  AccesoModuloReportesDenegadoError,
  ClienteFueraDeAlcanceError,
  ReporteNoEncontradoError,
} from "../domain/reporte.errors";
import { generarReporteSchema, listarHistorialSchema } from "../application/reporte.schema";
import type { GenerarReporteUseCase } from "../application/casos-uso/generar-reporte.usecase";
import type { ListarHistorialReportesUseCase } from "../application/casos-uso/listar-historial-reportes.usecase";

export class ReporteController {
  constructor(
    private readonly generarUc: GenerarReporteUseCase,
    private readonly historialUc: ListarHistorialReportesUseCase,
  ) {}

  generar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = generarReporteSchema.parse(req.body);
      const resultado = await this.generarUc.generar(req.usuario!.empresaId, req.usuario!.id, req.alcance!, input);
      res.status(201).json(respuestaExitosa(resultado));
    } catch (e) { next(this.m(e)); }
  };

  listarHistorial = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tipo, clienteId, pagina, porPagina } = listarHistorialSchema.parse(req.query);
      const { items, total } = await this.historialUc.listar(req.usuario!.empresaId, req.alcance!, { tipo, clienteId }, { pagina, porPagina });
      res.json(respuestaExitosa(items, { pagina, porPagina, total }));
    } catch (e) { next(this.m(e)); }
  };

  descargar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = await this.historialUc.obtenerParaDescarga(req.params["id"]!, req.usuario!.empresaId, req.alcance!);
      res.json(respuestaExitosa({ url }));
    } catch (e) { next(this.m(e)); }
  };

  previewConsolidado = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clienteId = String(req.query["clienteId"] ?? "");
      const fechaDesde = String(req.query["fechaDesde"] ?? "");
      const fechaHasta = String(req.query["fechaHasta"] ?? "");
      const datos = await this.generarUc.obtenerPreviewConsolidado(req.usuario!.empresaId, req.alcance!, clienteId, fechaDesde, fechaHasta);
      res.json(respuestaExitosa(datos));
    } catch (e) { next(this.m(e)); }
  };

  previewComparativo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clienteId = String(req.query["clienteId"] ?? "");
      const sucursalIds = String(req.query["sucursalIds"] ?? "").split(",").filter(Boolean);
      const fechaDesde = String(req.query["fechaDesde"] ?? "");
      const fechaHasta = String(req.query["fechaHasta"] ?? "");
      const datos = await this.generarUc.obtenerPreviewComparativo(req.usuario!.empresaId, req.alcance!, clienteId, sucursalIds, fechaDesde, fechaHasta);
      res.json(respuestaExitosa(datos));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof ClienteFueraDeAlcanceError)         return new ErrorHttp(403, "cliente_fuera_de_alcance", e.message);
    if (e instanceof AccesoModuloReportesDenegadoError)  return new ErrorHttp(403, "acceso_modulo_reportes_denegado", e.message);
    if (e instanceof ReporteNoEncontradoError)           return new ErrorHttp(404, "reporte_no_encontrado", e.message);
    return e;
  }
}
