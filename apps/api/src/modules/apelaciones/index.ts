import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import { PresentarApelacionUseCase } from "./application/casos-uso/presentar-apelacion.usecase";
import { ResolverApelacionUseCase } from "./application/casos-uso/resolver-apelacion.usecase";
import { ListarApelacionesUseCase } from "./application/casos-uso/listar-apelaciones.usecase";
import { ApelacionController } from "./infrastructure/apelacion.controller";
import { ApelacionPrismaRepository } from "./infrastructure/apelacion.prisma-repository";
import { crearApelacionesRouter } from "./infrastructure/apelaciones.router";
import type { PuertoCertificacionParaApelaciones } from "./domain/puerto-certificacion.port";
import { requierePermiso } from "../../middleware/permiso.middleware";

export function crearModuloApelaciones(
  prisma: PrismaClient,
  autenticar: RequestHandler,
  resolverAlcance: RequestHandler,
  puertoCertificacion: PuertoCertificacionParaApelaciones,
) {
  const repo = new ApelacionPrismaRepository(prisma);
  const presentarUc = new PresentarApelacionUseCase(repo, puertoCertificacion);
  const resolverUc = new ResolverApelacionUseCase(repo, puertoCertificacion);
  const listarUc = new ListarApelacionesUseCase(repo, puertoCertificacion);
  const controller = new ApelacionController(presentarUc, resolverUc, listarUc);
  const requierePermisoResolver = requierePermiso("apelaciones.resolver", prisma);

  return {
    router: crearApelacionesRouter(controller, autenticar, resolverAlcance, requierePermisoResolver),
  };
}
