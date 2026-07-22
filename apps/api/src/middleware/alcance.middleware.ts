import type { NextFunction, Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { calcularAlcance, requiereSucursalId } from "../modules/auth/domain/usuario.entity";
import { ErrorHttp } from "../shared/error-http";

/**
 * Calcula `req.alcance` a partir de `req.usuario` (ya adjuntado por `autenticacion`).
 * Se monta dentro de los routers de dominio que lo necesitan (clientes, sucursales),
 * no globalmente — ver nota en impl.md de 004-usuarios-roles-alcance.
 */
export function crearMiddlewareAlcance(prisma: PrismaClient) {
  return async function resolverAlcance(req: Request, _res: Response, next: NextFunction) {
    try {
      if (!req.usuario) {
        throw new ErrorHttp(401, "no_autenticado", "Falta autenticación.");
      }

      const sucursalesAdicionales = requiereSucursalId(req.usuario.rol)
        ? (await prisma.usuarioSucursalAcceso.findMany({ where: { usuarioId: req.usuario.id } })).map((a) => a.sucursalId)
        : [];

      req.alcance = calcularAlcance(req.usuario, sucursalesAdicionales);
      next();
    } catch (error) {
      next(error);
    }
  };
}
