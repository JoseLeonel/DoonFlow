import { Router } from "express";
import type { RequestHandler } from "express";
import type { Multer } from "multer";
import type { IntegracionesController } from "./integraciones.controller";

export function crearIntegracionesRouter(ctrl: IntegracionesController, autenticar: RequestHandler, subidaArchivo: Multer): Router {
  const r = Router();
  r.use(autenticar);

  r.get("/importaciones/plantilla", ctrl.descargarPlantilla);
  r.post("/importaciones/clientes/previsualizar", subidaArchivo.single("archivo"), ctrl.previsualizarClientes);
  r.post("/importaciones/clientes", subidaArchivo.single("archivo"), ctrl.importarClientes);
  r.post("/importaciones/sucursales/previsualizar", subidaArchivo.single("archivo"), ctrl.previsualizarSucursales);
  r.post("/importaciones/sucursales", subidaArchivo.single("archivo"), ctrl.importarSucursales);
  r.get("/importaciones", ctrl.listarHistorial);
  r.get("/importaciones/:id/errores", ctrl.descargarErrores);

  return r;
}
