import type { NextFunction, Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { ROL_ADMIN } from "@doonflow/shared";
import { ErrorHttp } from "../shared/error-http";

/**
 * Caché de proceso `rolNombre → Set<codigoPermiso>` — evita ir a BD en cada request.
 * `req.usuario` solo trae el nombre del rol (no `rolId`), así que se cachea por nombre.
 * Se invalida por completo tras cualquier `PUT /permisos/roles/:rolId` exitoso (ver
 * `rol-permiso.controller.ts`) — los cambios de permisos son poco frecuentes (acción de
 * administrador), así que limpiar todo el caché es más simple que rastrear qué rol cambió
 * y sigue siendo correcto.
 */
let cache: Map<string, Set<string>> | null = null;

export function invalidarCachePermisos(): void {
  cache = null;
}

async function permisosDelRol(prisma: PrismaClient, rolNombre: string): Promise<Set<string>> {
  if (!cache) cache = new Map();
  const existente = cache.get(rolNombre);
  if (existente) return existente;

  const rol = await prisma.rol.findUnique({
    where: { nombre: rolNombre },
    include: { rolPermisos: { include: { permiso: true } } },
  });
  const codigos = new Set(rol?.rolPermisos.map((rp) => rp.permiso.codigo) ?? []);
  cache.set(rolNombre, codigos);
  return codigos;
}

/**
 * Guard de permisos granulares — usar después de `autenticacion`. El rol `administrador`
 * siempre pasa (bypass total, sin ir a `RolPermiso`) por regla de negocio (`esRolAdministrador`).
 */
export function requierePermiso(codigo: string, prisma: PrismaClient) {
  return async function permiso(req: Request, _res: Response, next: NextFunction) {
    try {
      if (!req.usuario) throw new ErrorHttp(401, "no_autenticado", "Falta autenticación.");
      if (req.usuario.rol === ROL_ADMIN) { next(); return; }

      const codigos = await permisosDelRol(prisma, req.usuario.rol);
      if (!codigos.has(codigo)) {
        throw new ErrorHttp(403, "permiso_denegado", "No tienes permiso para realizar esta acción.");
      }
      next();
    } catch (e) { next(e); }
  };
}
