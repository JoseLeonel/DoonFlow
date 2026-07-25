import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import {
  ApelacionNoEncontradaError,
  ApelacionSeparacionFuncionesError,
  ApelacionYaResueltaError,
  CertificacionNoFirmadaError,
  CertificacionVencidaError,
  HallazgoDeApelacionNoEncontradoError,
  InspeccionNoEncontradaError,
  PlazoApelacionVencidoError,
} from "../domain/apelacion.errors";
import { crearApelacionSchema, resolverApelacionSchema } from "../application/apelacion.schema";
import type { PresentarApelacionUseCase } from "../application/casos-uso/presentar-apelacion.usecase";
import type { ResolverApelacionUseCase } from "../application/casos-uso/resolver-apelacion.usecase";
import type { ListarApelacionesUseCase } from "../application/casos-uso/listar-apelaciones.usecase";

export class ApelacionController {
  constructor(
    private readonly presentarUc: PresentarApelacionUseCase,
    private readonly resolverUc: ResolverApelacionUseCase,
    private readonly listarUc: ListarApelacionesUseCase,
  ) {}

  presentar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = crearApelacionSchema.parse(req.body);
      const apelacion = await this.presentarUc.ejecutar(req.usuario!.empresaId, req.usuario!.id, input, req.alcance);
      res.status(201).json(respuestaExitosa(apelacion));
    } catch (e) { next(this.m(e)); }
  };

  listarAbiertas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apelaciones = await this.listarUc.listarAbiertas(req.usuario!.empresaId);
      res.json(respuestaExitosa(apelaciones));
    } catch (e) { next(this.m(e)); }
  };

  obtener = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apelacion = await this.listarUc.obtenerPorId(req.params["id"]!, req.usuario!.empresaId);
      if (!apelacion) throw new ApelacionNoEncontradaError(req.params["id"]!);
      res.json(respuestaExitosa(apelacion));
    } catch (e) { next(this.m(e)); }
  };

  listarPorInspeccion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apelaciones = await this.listarUc.listarPorInspeccion(
        req.params["inspeccionId"]!,
        req.usuario!.empresaId,
        req.alcance,
      );
      res.json(respuestaExitosa(apelaciones));
    } catch (e) { next(this.m(e)); }
  };

  resolver = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = resolverApelacionSchema.parse(req.body);
      const apelacion = await this.resolverUc.ejecutar(req.params["id"]!, req.usuario!.empresaId, req.usuario!.id, input);
      res.json(respuestaExitosa(apelacion));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof ApelacionNoEncontradaError) return new ErrorHttp(404, "apelacion_no_encontrada", e.message);
    if (e instanceof InspeccionNoEncontradaError) return new ErrorHttp(404, "certificacion_no_encontrada", e.message);
    if (e instanceof HallazgoDeApelacionNoEncontradoError) return new ErrorHttp(404, "hallazgo_no_encontrado", e.message);
    if (e instanceof CertificacionNoFirmadaError) return new ErrorHttp(400, "certificacion_no_firmada", e.message);
    if (e instanceof CertificacionVencidaError) return new ErrorHttp(400, "certificacion_vencida", e.message);
    if (e instanceof PlazoApelacionVencidoError) return new ErrorHttp(400, "plazo_apelacion_vencido", e.message);
    if (e instanceof ApelacionYaResueltaError) return new ErrorHttp(409, "apelacion_ya_resuelta", e.message);
    if (e instanceof ApelacionSeparacionFuncionesError) return new ErrorHttp(403, "separacion_funciones_apelacion", e.message);
    return e;
  }
}
