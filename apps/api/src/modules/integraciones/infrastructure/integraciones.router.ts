import { Router } from "express";
import type { RequestHandler } from "express";
import type { Multer } from "multer";
import { ROL_ADMIN } from "@doonflow/shared";
import { requiereRol } from "../../../middleware/autorizacion.middleware";
import type { IntegracionesController } from "./integraciones.controller";
import type { ApiKeyController } from "./api-key.controller";

export function crearIntegracionesRouter(
  ctrl: IntegracionesController,
  apiKeyCtrl: ApiKeyController,
  autenticar: RequestHandler,
  subidaArchivo: Multer,
): Router {
  const r = Router();
  r.use(autenticar);

  r.get("/importaciones/plantilla", ctrl.descargarPlantilla);
  r.post("/importaciones/clientes/previsualizar", subidaArchivo.single("archivo"), ctrl.previsualizarClientes);
  r.post("/importaciones/clientes", subidaArchivo.single("archivo"), ctrl.importarClientes);
  r.post("/importaciones/sucursales/previsualizar", subidaArchivo.single("archivo"), ctrl.previsualizarSucursales);
  r.post("/importaciones/sucursales", subidaArchivo.single("archivo"), ctrl.importarSucursales);
  r.get("/importaciones", ctrl.listarHistorial);
  r.get("/importaciones/:id/errores", ctrl.descargarErrores);

  // Gestión de API keys (HU-3) — solo administrador, ve/crea/revoca claves de su propia empresa.
  r.use("/api-keys", requiereRol(ROL_ADMIN));
  r.get("/api-keys", apiKeyCtrl.listar);
  r.post("/api-keys", apiKeyCtrl.crear);
  r.post("/api-keys/:id/revocar", apiKeyCtrl.revocar);

  return r;
}
