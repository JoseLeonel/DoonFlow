import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import { HallazgoFrecuenteNoEncontradoError } from "../domain/hallazgo-frecuente.errors";
import { actualizarHallazgoFrecuenteSchema, crearHallazgoFrecuenteSchema } from "../application/hallazgo-frecuente.schema";
import type { GestionarHallazgoFrecuenteUseCase } from "../application/casos-uso/gestionar-hallazgo-frecuente.usecase";

export class HallazgoFrecuenteController {
  constructor(private readonly usecase: GestionarHallazgoFrecuenteUseCase) {}

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const soloActivos = req.query["soloActivos"] === "true";
      const items = await this.usecase.listar(req.usuario!.empresaId, { soloActivos });
      res.json(respuestaExitosa(items));
    } catch (e) { next(this.m(e)); }
  };

  crear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = crearHallazgoFrecuenteSchema.parse(req.body);
      const item = await this.usecase.crear(req.usuario!.empresaId, input);
      res.status(201).json(respuestaExitosa(item));
    } catch (e) { next(this.m(e)); }
  };

  actualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = actualizarHallazgoFrecuenteSchema.parse(req.body);
      const item = await this.usecase.actualizar(req.params["id"]!, req.usuario!.empresaId, input);
      res.json(respuestaExitosa(item));
    } catch (e) { next(this.m(e)); }
  };

  activar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await this.usecase.activar(req.params["id"]!, req.usuario!.empresaId);
      res.json(respuestaExitosa(item));
    } catch (e) { next(this.m(e)); }
  };

  desactivar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await this.usecase.desactivar(req.params["id"]!, req.usuario!.empresaId);
      res.json(respuestaExitosa(item));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof HallazgoFrecuenteNoEncontradoError) return new ErrorHttp(404, "hallazgo_frecuente_no_encontrado", e.message);
    return e;
  }
}
