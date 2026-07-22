import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import { ClientePrismaRepository } from "../clientes/infrastructure/cliente.prisma-repository";
import { GestionarSucursalUseCase } from "./application/casos-uso/gestionar-sucursal.usecase";
import { SucursalController } from "./infrastructure/sucursal.controller";
import { SucursalPrismaRepository } from "./infrastructure/sucursal.prisma-repository";
import { crearSucursalesRouter } from "./infrastructure/sucursales.router";

export function crearModuloSucursales(prisma: PrismaClient, autenticar: RequestHandler, resolverAlcance: RequestHandler) {
  const repo        = new SucursalPrismaRepository(prisma);
  const clienteRepo = new ClientePrismaRepository(prisma);
  const uc          = new GestionarSucursalUseCase(repo, clienteRepo);
  const ctrl        = new SucursalController(uc);
  return { router: crearSucursalesRouter(ctrl, autenticar, resolverAlcance) };
}
