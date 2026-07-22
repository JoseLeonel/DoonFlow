import { Router } from "express";
import type { RequestHandler } from "express";
import type { AvisoPrivacidadController } from "./aviso-privacidad.controller";

/**
 * Montado bajo `/privacidad` (no anidado dentro de `/clientes`/`/sucursales`, ver impl.md
 * para la desviación respecto al contrato original del spec): `entidadTipo` (`CLIENTE`/`SUCURSAL`)
 * viaja como segmento de ruta en vez de duplicar el router en dos módulos distintos.
 */
export function crearPrivacidadRouter(ctrl: AvisoPrivacidadController, autenticar: RequestHandler): Router {
  const r = Router();
  r.use(autenticar);

  r.get("/:entidadTipo/:entidadId", ctrl.listar);
  r.post("/:entidadTipo/:entidadId", ctrl.registrar);

  return r;
}
