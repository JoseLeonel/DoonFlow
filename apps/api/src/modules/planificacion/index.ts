import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import { GestionarPlanAuditoriaUseCase } from "./application/casos-uso/gestionar-plan-auditoria.usecase";
import { PlanAuditoriaController } from "./infrastructure/plan-auditoria.controller";
import { PlanAuditoriaPrismaRepository } from "./infrastructure/plan-auditoria.prisma-repository";
import { crearPlanificacionRouter } from "./infrastructure/planificacion.router";

export function crearModuloPlanificacion(prisma: PrismaClient, autenticar: RequestHandler, resolverAlcance: RequestHandler) {
  const repo = new PlanAuditoriaPrismaRepository(prisma);
  const useCase = new GestionarPlanAuditoriaUseCase(repo);
  const controller = new PlanAuditoriaController(useCase);

  return {
    router: crearPlanificacionRouter(controller, autenticar, resolverAlcance),
    useCase,
  };
}
