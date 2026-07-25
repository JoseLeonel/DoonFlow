import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import { NotificacionNoEncontradaError } from "../domain/notificacion.errors";
import { listarNotificacionesQuerySchema } from "../application/notificacion.schema";
import type { GestionarNotificacionesUseCase } from "../application/casos-uso/gestionar-notificaciones.usecase";

export class NotificacionController {
  constructor(private readonly usecase: GestionarNotificacionesUseCase) {}

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listarNotificacionesQuerySchema.parse(req.query);
      const notificaciones = await this.usecase.listar(req.usuario!.id, req.usuario!.empresaId, query);
      res.json(respuestaExitosa(notificaciones));
    } catch (e) { next(this.m(e)); }
  };

  contarNoLeidas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const total = await this.usecase.contarNoLeidas(req.usuario!.id, req.usuario!.empresaId);
      res.json(respuestaExitosa({ total }));
    } catch (e) { next(this.m(e)); }
  };

  marcarLeida = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notificacion = await this.usecase.marcarLeida(req.params["id"]!, req.usuario!.id);
      res.json(respuestaExitosa(notificacion));
    } catch (e) { next(this.m(e)); }
  };

  marcarTodasLeidas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const total = await this.usecase.marcarTodasLeidas(req.usuario!.id, req.usuario!.empresaId);
      res.json(respuestaExitosa({ total }));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof NotificacionNoEncontradaError) return new ErrorHttp(404, "notificacion_no_encontrada", e.message);
    return e;
  }
}
