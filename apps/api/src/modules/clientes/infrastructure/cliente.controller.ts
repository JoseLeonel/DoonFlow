import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import { ClienteNoEncontradoError, EmailInvalidoError, IdentificacionDuplicadaError } from "../domain/cliente.errors";
import { crearClienteSchema, actualizarClienteSchema } from "../application/cliente.schema";
import type { GestionarClienteUseCase } from "../application/casos-uso/gestionar-cliente.usecase";

export class ClienteController {
  constructor(private readonly uc: GestionarClienteUseCase) {}

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagina = Number(req.query["pagina"] ?? 1);
      const porPagina = Number(req.query["porPagina"] ?? 20);
      const { items, total } = await this.uc.listar(req.usuario!.empresaId, req.alcance, { pagina, porPagina });
      res.json(respuestaExitosa(items, { pagina, porPagina, total }));
    } catch (e) { next(e); }
  };

  obtener = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(respuestaExitosa(await this.uc.obtenerPorId(req.params["id"]!, req.usuario!.empresaId, req.alcance)));
    } catch (e) { next(this.m(e)); }
  };

  crear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = crearClienteSchema.parse(req.body);
      res.status(201).json(respuestaExitosa(await this.uc.crear(req.usuario!.empresaId, input)));
    } catch (e) { next(this.m(e)); }
  };

  actualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = actualizarClienteSchema.parse(req.body);
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

  private m(e: unknown) {
    if (e instanceof ClienteNoEncontradoError)     return new ErrorHttp(404, "cliente_no_encontrado", e.message);
    if (e instanceof IdentificacionDuplicadaError) return new ErrorHttp(409, "identificacion_duplicada", e.message);
    if (e instanceof EmailInvalidoError)            return new ErrorHttp(400, "email_invalido", e.message);
    return e;
  }
}
