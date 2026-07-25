import { Router } from "express";
import type { RequestHandler } from "express";
import type { HallazgoFrecuenteController } from "./hallazgo-frecuente.controller";

export function crearHallazgosFrecuentesRouter(ctrl: HallazgoFrecuenteController, autenticar: RequestHandler): Router {
  const r = Router();
  r.use(autenticar);

  r.get   ("/",               ctrl.listar);
  r.post  ("/",               ctrl.crear);
  r.patch ("/:id",             ctrl.actualizar);
  r.post  ("/:id/activar",    ctrl.activar);
  r.post  ("/:id/desactivar", ctrl.desactivar);

  return r;
}
