import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import { requiereRol } from "../../middleware/autorizacion.middleware";
import { RegistrarAuditoriaUseCase } from "./application/casos-uso/registrar-auditoria.usecase";
import { ListarAuditoriaUseCase } from "./application/casos-uso/listar-auditoria.usecase";
import { AuditoriaController } from "./infrastructure/auditoria.controller";
import { RegistroAuditoriaPrismaRepository } from "./infrastructure/registro-auditoria.prisma-repository";
import { crearAuditoriaRouter } from "./infrastructure/auditoria.router";

export function crearModuloAuditoria(prisma: PrismaClient, autenticar: RequestHandler) {
  const repo = new RegistroAuditoriaPrismaRepository(prisma);
  const registrarUseCase = new RegistrarAuditoriaUseCase(repo);
  const listarUseCase = new ListarAuditoriaUseCase(repo);
  const controller = new AuditoriaController(listarUseCase);
  const requiereAuditorOAdmin = requiereRol("administrador", "auditor");

  return {
    router: crearAuditoriaRouter(controller, autenticar, requiereAuditorOAdmin),
    registrarUseCase,
  };
}
