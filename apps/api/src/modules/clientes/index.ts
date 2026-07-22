import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import { GestionarClienteUseCase } from "./application/casos-uso/gestionar-cliente.usecase";
import { ClienteController } from "./infrastructure/cliente.controller";
import { ClientePrismaRepository } from "./infrastructure/cliente.prisma-repository";
import { crearClientesRouter } from "./infrastructure/clientes.router";

export function crearModuloClientes(prisma: PrismaClient, autenticar: RequestHandler, resolverAlcance: RequestHandler) {
  const repo   = new ClientePrismaRepository(prisma);
  const uc     = new GestionarClienteUseCase(repo);
  const ctrl   = new ClienteController(uc);
  return { router: crearClientesRouter(ctrl, autenticar, resolverAlcance) };
}
