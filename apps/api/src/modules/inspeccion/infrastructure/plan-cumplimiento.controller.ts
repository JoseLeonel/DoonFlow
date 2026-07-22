import type { Request, Response, NextFunction } from "express";
import { respuestaExitosa } from "../../../shared/sobre-respuesta";
import { ErrorHttp } from "../../../shared/error-http";
import {
  InspeccionNoEncontradaError,
  PlanCumplimientoConHallazgosSinAccionError,
  PlanCumplimientoNoEncontradoError,
  PlanCumplimientoSinHallazgosError,
  PlanCumplimientoYaExisteError,
  SinPermisoVerificacionError,
} from "../domain/inspeccion.errors";
import { crearAccionSchema } from "../application/plan-cumplimiento.schema";
import type { GestionarPlanCumplimientoUseCase } from "../application/casos-uso/gestionar-plan-cumplimiento.usecase";
import type { GestionarAccionCorrectivaUseCase } from "../application/casos-uso/gestionar-accion-correctiva.usecase";

export class PlanCumplimientoController {
  constructor(
    private readonly planUseCase: GestionarPlanCumplimientoUseCase,
    private readonly accionUseCase: GestionarAccionCorrectivaUseCase,
  ) {}

  generar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await this.planUseCase.generar(req.params["id"]!, req.usuario!.empresaId, req.alcance);
      res.status(201).json(respuestaExitosa(plan));
    } catch (e) { next(this.m(e)); }
  };

  obtener = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await this.planUseCase.obtenerConIndicadores(req.params["id"]!, req.usuario!.empresaId, req.alcance);
      res.json(respuestaExitosa(plan));
    } catch (e) { next(this.m(e)); }
  };

  crearAccion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = crearAccionSchema.parse(req.body);
      const accion = await this.accionUseCase.crear(req.params["id"]!, input);
      res.status(201).json(respuestaExitosa(accion));
    } catch (e) { next(this.m(e)); }
  };

  cerrar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await this.planUseCase.cerrar(req.params["id"]!, req.usuario!.empresaId, req.usuario!);
      res.json(respuestaExitosa(plan));
    } catch (e) { next(this.m(e)); }
  };

  reabrir = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await this.planUseCase.reabrir(req.params["id"]!, req.usuario!.empresaId, req.usuario!);
      res.json(respuestaExitosa(plan));
    } catch (e) { next(this.m(e)); }
  };

  private m(e: unknown) {
    if (e instanceof InspeccionNoEncontradaError) return new ErrorHttp(404, "certificacion_no_encontrada", e.message);
    if (e instanceof PlanCumplimientoNoEncontradoError) return new ErrorHttp(404, "plan_no_encontrado", e.message);
    if (e instanceof PlanCumplimientoYaExisteError) return new ErrorHttp(409, "plan_ya_existe", e.message);
    if (e instanceof PlanCumplimientoSinHallazgosError) return new ErrorHttp(422, "plan_sin_hallazgos", e.message);
    if (e instanceof PlanCumplimientoConHallazgosSinAccionError) return new ErrorHttp(409, "plan_con_hallazgos_sin_accion", e.message);
    if (e instanceof SinPermisoVerificacionError) return new ErrorHttp(403, "sin_permiso_verificacion", e.message);
    return e;
  }
}
