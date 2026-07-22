import { Router } from "express";
import type { RequestHandler } from "express";
import type { RolPermisoController } from "./rol-permiso.controller";

export function crearPermisosRouter(
  ctrl: RolPermisoController,
  autenticar: RequestHandler,
  requierePermisoAdministrar: RequestHandler,
): Router {
  const r = Router();
  r.use(autenticar);

  r.get("/matriz", requierePermisoAdministrar, ctrl.obtenerMatriz);
  r.put("/roles/:rolId", requierePermisoAdministrar, ctrl.asignarPermisos);

  return r;
}
