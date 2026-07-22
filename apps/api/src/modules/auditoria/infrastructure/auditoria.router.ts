import { Router } from "express";
import type { RequestHandler } from "express";
import type { AuditoriaController } from "./auditoria.controller";

export function crearAuditoriaRouter(
  ctrl: AuditoriaController,
  autenticar: RequestHandler,
  requiereAuditorOAdmin: RequestHandler,
): Router {
  const r = Router();
  r.use(autenticar);

  r.get("/", requiereAuditorOAdmin, ctrl.listar);

  return r;
}
