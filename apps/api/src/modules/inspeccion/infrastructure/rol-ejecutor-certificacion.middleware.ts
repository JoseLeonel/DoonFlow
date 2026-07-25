import type { NextFunction, Request, Response } from "express";
import { ErrorHttp } from "../../../shared/error-http";
import { puedeEjecutarCertificacion } from "../domain/certificacion.entity";

/**
 * Guard T-172 (004-usuarios-roles-alcance) — usar después de `autenticacion`.
 * Bloquea con 403 `rol_no_autorizado` a `administrador_cliente`/`usuario_sucursal` en las
 * rutas de escritura del flujo de ejecución de certificación (iniciar/responder/evidencias/
 * sincronización/firma); esos roles permanecen de solo lectura sobre la ficha BPM.
 */
export function requiereRolEjecutorCertificacion(req: Request, _res: Response, next: NextFunction) {
  if (!req.usuario) {
    next(new ErrorHttp(401, "no_autenticado", "Falta autenticación."));
    return;
  }
  if (!puedeEjecutarCertificacion(req.usuario.rol)) {
    next(new ErrorHttp(403, "rol_no_autorizado", "Tu rol solo tiene acceso de lectura sobre certificaciones."));
    return;
  }
  next();
}
