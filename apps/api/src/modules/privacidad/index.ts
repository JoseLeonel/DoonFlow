import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import { GestionarAvisoPrivacidadUseCase } from "./application/casos-uso/gestionar-aviso-privacidad.usecase";
import { AvisoPrivacidadController } from "./infrastructure/aviso-privacidad.controller";
import { AvisoPrivacidadPrismaRepository } from "./infrastructure/aviso-privacidad.prisma-repository";
import { crearPrivacidadRouter } from "./infrastructure/privacidad.router";
import { ClientePrismaRepository } from "../clientes/infrastructure/cliente.prisma-repository";
import { SucursalPrismaRepository } from "../sucursales/infrastructure/sucursal.prisma-repository";

export function crearModuloPrivacidad(prisma: PrismaClient, autenticar: RequestHandler) {
  const repo = new AvisoPrivacidadPrismaRepository(prisma);
  const clienteRepo = new ClientePrismaRepository(prisma);
  const sucursalRepo = new SucursalPrismaRepository(prisma);
  const useCase = new GestionarAvisoPrivacidadUseCase(repo, clienteRepo, sucursalRepo);
  const controller = new AvisoPrivacidadController(useCase);

  return {
    router: crearPrivacidadRouter(controller, autenticar),
  };
}
