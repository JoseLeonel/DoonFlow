import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import { ClienteNoEncontradoError, CorreoInvalidoError, SucursalNoEncontradaError } from "../domain/sucursal.errors";
import { crearSucursalSchema, actualizarSucursalSchema } from "../application/sucursal.schema";
import type { GestionarSucursalUseCase } from "../application/casos-uso/gestionar-sucursal.usecase";

export class SucursalController {
  constructor(private readonly uc: GestionarSucursalUseCase) {}

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clienteId = String(req.query["clienteId"] ?? "");
      const pagina = Number(req.query["pagina"] ?? 1);
      const porPagina = Number(req.query["porPagina"] ?? 20);
      const { items, total } = await this.uc.listarPorCliente(clienteId, req.usuario!.empresaId, req.alcance, { pagina, porPagina });
      res.json(respuestaExitosa(items, { pagina, porPagina, total }));
    } catch (e) { next(this.m(e)); }
  };

  obtener = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(respuestaExitosa(await this.uc.obtenerPorId(req.params["id"]!, req.usuario!.empresaId, req.alcance)));
    } catch (e) { next(this.m(e)); }
  };

  crear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = crearSucursalSchema.parse(req.body);
      res.status(201).json(respuestaExitosa(await this.uc.crear(req.usuario!.empresaId, input)));
    } catch (e) { next(this.m(e)); }
  };

  actualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = actualizarSucursalSchema.parse(req.body);
      res.json(respuestaExitosa(await this.uc.actualizar(req.params["id"]!, req.usuario!.empresaId, input)));
    } catch (e) { next(this.m(e)); }
  };

  activar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(respuestaExitosa(await this.uc.activar(req.params["id"]!, req.usuario!.empresaId)));
    } catch (e) { next(this.m(e)); }
  };

  desactivar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(respuestaExitosa(await this.uc.desactivar(req.params["id"]!, req.usuario!.empresaId)));
    } catch (e) { next(this.m(e)); }
  };

  historico = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(respuestaExitosa(await this.uc.obtenerHistorico(req.params["id"]!, req.usuario!.empresaId, req.alcance)));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof SucursalNoEncontradaError) return new ErrorHttp(404, "sucursal_no_encontrada", e.message);
    if (e instanceof ClienteNoEncontradoError)  return new ErrorHttp(404, "cliente_no_encontrado", e.message);
    if (e instanceof CorreoInvalidoError)       return new ErrorHttp(400, "correo_invalido", e.message);
    return e;
  }
}
