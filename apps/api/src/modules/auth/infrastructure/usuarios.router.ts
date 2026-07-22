import { Router } from "express";
import type { RequestHandler } from "express";
import { ROL_ADMIN } from "@doonflow/shared";
import { requiereRol } from "../../../middleware/autorizacion.middleware";
import type { UsuarioController } from "./usuario.controller";

/** Solo `administrador` (general) gestiona usuarios en este sprint — ver nota de alcance en task.md. */
export function crearUsuariosRouter(ctrl: UsuarioController, autenticar: RequestHandler): Router {
  const r = Router();
  r.use(autenticar);
  r.use(requiereRol(ROL_ADMIN));

  r.get   ("/",               ctrl.listar);
  r.post  ("/",               ctrl.crear);
  r.get   ("/roles",          ctrl.listarRoles);
  r.get   ("/:id",            ctrl.obtener);
  r.patch ("/:id",             ctrl.actualizar);
  r.post  ("/:id/activar",    ctrl.activar);
  r.post  ("/:id/desactivar", ctrl.desactivar);
  r.post  ("/:id/cambiar-password", ctrl.cambiarPassword);

  return r;
}
