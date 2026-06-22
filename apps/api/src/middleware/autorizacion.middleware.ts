import type { NextFunction, Request, Response } from "express";
import type { RolSistema } from "@doonflow/shared";
import { ErrorHttp } from "../shared/error-http";

/** Guard de roles — usar después de `autenticacion`. */
export function requiereRol(...rolesPermitidos: RolSistema[]) {
  return function autorizacion(req: Request, _res: Response, next: NextFunction) {
    if (!req.usuario) {
      next(new ErrorHttp(401, "no_autenticado", "Falta autenticación."));
      return;
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      next(new ErrorHttp(403, "rol_no_autorizado", "El rol del usuario no tiene acceso a este recurso."));
      return;
    }

    next();
  };
}
