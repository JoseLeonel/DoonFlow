import { Router } from "express";
import type { RequestHandler } from "express";
import type { ReporteController } from "./reporte.controller";

export function crearReportesRouter(ctrl: ReporteController, autenticar: RequestHandler, resolverAlcance: RequestHandler): Router {
  const r = Router();
  r.use(autenticar);
  r.use(resolverAlcance);

  r.post("/", ctrl.generar);
  r.get("/", ctrl.listarHistorial);
  r.get("/consolidado-cliente/preview", ctrl.previewConsolidado);
  r.get("/comparativo-sucursales/preview", ctrl.previewComparativo);
  r.get("/:id/descargar", ctrl.descargar);

  return r;
}
