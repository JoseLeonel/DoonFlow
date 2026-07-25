import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { VerificacionController } from "./verificacion.controller";

/** Sin middleware `autenticar` — portal público, ver spec 006 → regla de negocio 2. */
export function crearVerificacionRouter(ctrl: VerificacionController): Router {
  const r = Router();

  // Única ruta pública sin JWT de toda la API — limita fuerza bruta sobre el espacio de códigos.
  const limitador = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
  r.use(limitador);

  r.get("/:codigo", ctrl.verificar);

  return r;
}
