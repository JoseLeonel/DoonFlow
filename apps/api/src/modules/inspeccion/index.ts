import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import { GestionarPlantillaUseCase } from "./application/casos-uso/gestionar-plantilla.usecase";
import { PlantillaController } from "./infrastructure/plantilla.controller";
import { PlantillaPrismaRepository } from "./infrastructure/plantilla.prisma-repository";
import { crearInspeccionRouter } from "./infrastructure/inspeccion.router";

export function crearModuloInspeccion(prisma: PrismaClient, autenticar: RequestHandler) {
  const repo = new PlantillaPrismaRepository(prisma);
  const useCase = new GestionarPlantillaUseCase(repo);
  const controller = new PlantillaController(useCase);
  return { router: crearInspeccionRouter(controller, autenticar) };
}
