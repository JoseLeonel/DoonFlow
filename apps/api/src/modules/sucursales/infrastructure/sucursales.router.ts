import { Router } from "express";
import type { RequestHandler } from "express";
import type { SucursalController } from "./sucursal.controller";

export function crearSucursalesRouter(ctrl: SucursalController, autenticar: RequestHandler, resolverAlcance: RequestHandler): Router {
  const r = Router();
  r.use(autenticar);
  r.use(resolverAlcance);

  r.get   ("/",               ctrl.listar);
  r.post  ("/",               ctrl.crear);
  r.get   ("/:id",            ctrl.obtener);
  r.patch ("/:id",             ctrl.actualizar);
  r.post  ("/:id/activar",    ctrl.activar);
  r.post  ("/:id/desactivar", ctrl.desactivar);
  r.get   ("/:id/historico",  ctrl.historico);

  return r;
}
