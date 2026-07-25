import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import { PlanAuditoriaNoEncontradoError, PlanAuditoriaNoReprogramableError } from "../domain/plan-auditoria.errors";
import {
  ejecutarPlanAuditoriaSchema,
  programarPlanAuditoriaSchema,
  reprogramarPlanAuditoriaSchema,
} from "../application/plan-auditoria.schema";
import type { GestionarPlanAuditoriaUseCase } from "../application/casos-uso/gestionar-plan-auditoria.usecase";

export class PlanAuditoriaController {
  constructor(private readonly usecase: GestionarPlanAuditoriaUseCase) {}

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const planes = await this.usecase.listar(req.usuario!.empresaId, {
        sucursalId: req.query["sucursalId"] as string | undefined,
        mes: req.query["mes"] as string | undefined,
      }, req.alcance);
      res.json(respuestaExitosa(planes));
    } catch (e) { next(this.m(e)); }
  };

  programar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = programarPlanAuditoriaSchema.parse(req.body);
      const plan = await this.usecase.programar(req.usuario!.empresaId, input);
      res.status(201).json(respuestaExitosa(plan));
    } catch (e) { next(this.m(e)); }
  };

  reprogramar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = reprogramarPlanAuditoriaSchema.parse(req.body);
      const plan = await this.usecase.reprogramar(req.params["id"]!, req.usuario!.empresaId, input.fechaObjetivo);
      res.json(respuestaExitosa(plan));
    } catch (e) { next(this.m(e)); }
  };

  iniciarAhora = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resultado = await this.usecase.iniciarAhora(req.params["id"]!, req.usuario!.empresaId);
      res.json(respuestaExitosa(resultado));
    } catch (e) { next(this.m(e)); }
  };

  ejecutar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = ejecutarPlanAuditoriaSchema.parse(req.body);
      const plan = await this.usecase.marcarEjecutada(req.params["id"]!, req.usuario!.empresaId, input.inspeccionId);
      res.json(respuestaExitosa(plan));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof PlanAuditoriaNoEncontradoError) return new ErrorHttp(404, "plan_auditoria_no_encontrado", e.message);
    if (e instanceof PlanAuditoriaNoReprogramableError) return new ErrorHttp(409, "plan_auditoria_no_reprogramable", e.message);
    return e;
  }
}
