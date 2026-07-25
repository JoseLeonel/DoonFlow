import { Router } from "express";
import type { RequestHandler } from "express";
import type { PlanAuditoriaController } from "./plan-auditoria.controller";

export function crearPlanificacionRouter(ctrl: PlanAuditoriaController, autenticar: RequestHandler, resolverAlcance: RequestHandler): Router {
  const r = Router();
  r.use(autenticar);
  r.use(resolverAlcance);

  r.get ("/", ctrl.listar);
  r.post("/", ctrl.programar);
  r.patch("/:id/reprogramar", ctrl.reprogramar);
  r.post ("/:id/iniciar-ahora", ctrl.iniciarAhora);
  r.patch("/:id/ejecutar", ctrl.ejecutar);

  return r;
}
