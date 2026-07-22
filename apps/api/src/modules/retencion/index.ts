import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import { ROL_ADMIN } from "@doonflow/shared";
import { requiereRol } from "../../middleware/autorizacion.middleware";
import { GestionarPoliticaRetencionUseCase } from "./application/casos-uso/gestionar-politica-retencion.usecase";
import { PoliticaRetencionController } from "./infrastructure/politica-retencion.controller";
import { PoliticaRetencionPrismaRepository } from "./infrastructure/politica-retencion.prisma-repository";
import { crearRetencionRouter } from "./infrastructure/retencion.router";

export function crearModuloRetencion(prisma: PrismaClient, autenticar: RequestHandler) {
  const repo = new PoliticaRetencionPrismaRepository(prisma);
  const useCase = new GestionarPoliticaRetencionUseCase(repo);
  const controller = new PoliticaRetencionController(useCase);
  const requiereAdmin = requiereRol(ROL_ADMIN);

  return {
    router: crearRetencionRouter(controller, autenticar, requiereAdmin),
    repo,
  };
}
