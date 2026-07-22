import { Router } from "express";
import type { RequestHandler } from "express";
import type { PoliticaRetencionController } from "./politica-retencion.controller";

export function crearRetencionRouter(
  ctrl: PoliticaRetencionController,
  autenticar: RequestHandler,
  requiereAdmin: RequestHandler,
): Router {
  const r = Router();
  r.use(autenticar);
  r.use(requiereAdmin);

  r.get("/politicas", ctrl.listar);
  r.put("/politicas/:tipoDato", ctrl.actualizar);

  return r;
}
