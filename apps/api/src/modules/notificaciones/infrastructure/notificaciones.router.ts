import { Router } from "express";
import type { RequestHandler } from "express";
import type { NotificacionController } from "./notificacion.controller";

export function crearNotificacionesRouter(ctrl: NotificacionController, autenticar: RequestHandler): Router {
  const r = Router();
  r.use(autenticar);

  r.get  ("/no-leidas/contador", ctrl.contarNoLeidas);
  r.get  ("/", ctrl.listar);
  r.patch("/leer-todas", ctrl.marcarTodasLeidas);
  r.patch("/:id/leer", ctrl.marcarLeida);

  return r;
}
