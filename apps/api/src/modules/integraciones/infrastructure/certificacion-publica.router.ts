import { Router } from "express";
import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import type { CertificacionPublicaController } from "./certificacion-publica.controller";

/**
 * `GET /api/v1/certificaciones/verificar/:codigo` — autenticada por API key (a diferencia del
 * portal humano de 006, que es totalmente anónimo). El límite de tasa va **antes** del
 * middleware de autenticación (mismo orden que el portal humano) — es lo que realmente frena
 * la fuerza bruta sobre el espacio de claves: si fuera después, una clave inválida nunca
 * llegaría a contar contra el límite y un atacante podría probar claves sin restricción.
 * 60 req/min por IP (vs. 20 del portal humano) porque un uso legítimo tipo ERP consultando
 * varios códigos seguidos desde una sola IP es más intenso que un humano navegando.
 */
export function crearCertificacionPublicaRouter(ctrl: CertificacionPublicaController, autenticacionApiKey: RequestHandler): Router {
  const r = Router();

  const limitador = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });
  r.use(limitador);
  r.use(autenticacionApiKey);

  r.get("/certificaciones/verificar/:codigo", ctrl.verificar);

  return r;
}
