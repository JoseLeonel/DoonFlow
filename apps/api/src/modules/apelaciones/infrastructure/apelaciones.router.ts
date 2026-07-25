import { Router } from "express";
import type { RequestHandler } from "express";
import type { ApelacionController } from "./apelacion.controller";

export function crearApelacionesRouter(
  ctrl: ApelacionController,
  autenticar: RequestHandler,
  resolverAlcance: RequestHandler,
  requierePermisoResolver: RequestHandler,
): Router {
  const r = Router();
  r.use(autenticar);

  r.post("/", resolverAlcance, ctrl.presentar);
  r.get ("/", requierePermisoResolver, ctrl.listarAbiertas);

  // Antes de "/:id" — si no, "por-inspeccion" se capturaría como :id.
  r.get ("/por-inspeccion/:inspeccionId", resolverAlcance, ctrl.listarPorInspeccion);

  r.get ("/:id", requierePermisoResolver, ctrl.obtener);
  r.post("/:id/resolver", requierePermisoResolver, ctrl.resolver);

  return r;
}
