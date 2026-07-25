import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import { GestionarHallazgoFrecuenteUseCase } from "./application/casos-uso/gestionar-hallazgo-frecuente.usecase";
import { HallazgoFrecuenteController } from "./infrastructure/hallazgo-frecuente.controller";
import { HallazgoFrecuentePrismaRepository } from "./infrastructure/hallazgo-frecuente.prisma-repository";
import { crearHallazgosFrecuentesRouter } from "./infrastructure/hallazgos-frecuentes.router";

export function crearModuloHallazgosFrecuentes(prisma: PrismaClient, autenticar: RequestHandler) {
  const repo = new HallazgoFrecuentePrismaRepository(prisma);
  const useCase = new GestionarHallazgoFrecuenteUseCase(repo);
  const controller = new HallazgoFrecuenteController(useCase);

  return {
    router: crearHallazgosFrecuentesRouter(controller, autenticar),
  };
}
