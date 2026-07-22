import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import { GestionarMatrizPermisosUseCase } from "./application/casos-uso/gestionar-matriz-permisos.usecase";
import { RolPermisoController } from "./infrastructure/rol-permiso.controller";
import { RolPermisoPrismaRepository } from "./infrastructure/rol-permiso.prisma-repository";
import { crearPermisosRouter } from "./infrastructure/permisos.router";
import { requierePermiso } from "../../middleware/permiso.middleware";
import type { RegistradorEventoAuditoria } from "../../shared/auditoria/registrar-evento-auditoria";

export function crearModuloPermisos(
  prisma: PrismaClient,
  autenticar: RequestHandler,
  registrarEventoAuditoria?: RegistradorEventoAuditoria,
) {
  const repo = new RolPermisoPrismaRepository(prisma);
  const useCase = new GestionarMatrizPermisosUseCase(repo, registrarEventoAuditoria);
  const controller = new RolPermisoController(useCase);
  const requiereAdministrarPermisos = requierePermiso("permisos.administrar", prisma);

  return {
    router: crearPermisosRouter(controller, autenticar, requiereAdministrarPermisos),
  };
}
