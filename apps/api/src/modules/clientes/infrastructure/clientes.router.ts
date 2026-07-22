import { Router } from "express";
import type { RequestHandler } from "express";
import type { ClienteController } from "./cliente.controller";

export function crearClientesRouter(ctrl: ClienteController, autenticar: RequestHandler, resolverAlcance: RequestHandler): Router {
  const r = Router();
  r.use(autenticar);
  r.use(resolverAlcance);

  r.get   ("/",              ctrl.listar);
  r.post  ("/",              ctrl.crear);
  r.get   ("/:id",           ctrl.obtener);
  r.patch ("/:id",           ctrl.actualizar);
  r.post  ("/:id/activar",   ctrl.activar);
  r.post  ("/:id/desactivar",ctrl.desactivar);

  return r;
}
