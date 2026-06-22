import { Router } from "express";
import type { PlantillaController } from "./plantilla.controller";
import type { RequestHandler } from "express";

export function crearInspeccionRouter(ctrl: PlantillaController, autenticar: RequestHandler): Router {
  const r = Router();
  r.use(autenticar);

  // Plantillas
  r.get   ("/plantillas",               ctrl.listar);
  r.post  ("/plantillas",               ctrl.crear);
  r.get   ("/plantillas/:id",           ctrl.obtenerCompleta);
  r.patch ("/plantillas/:id",           ctrl.actualizar);
  r.delete("/plantillas/:id",           ctrl.eliminar);
  r.post  ("/plantillas/:id/activar",   ctrl.activar);
  r.post  ("/plantillas/:id/desactivar",ctrl.desactivar);
  r.post  ("/plantillas/:id/clonar",    ctrl.clonar);

  // Nodos genéricos (aplica a cualquier nivel: panel o pregunta)
  r.post  ("/plantillas/:id/nodos",             ctrl.crearNodo);
  r.patch ("/plantillas/:id/nodos/reordenar",   ctrl.reordenar);
  r.patch ("/plantillas/:id/nodos/:nodoId",     ctrl.actualizarNodo);
  r.delete("/plantillas/:id/nodos/:nodoId",     ctrl.eliminarNodo);

  return r;
}
