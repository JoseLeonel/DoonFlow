import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import { GestionarNotificacionesUseCase } from "./application/casos-uso/gestionar-notificaciones.usecase";
import { GenerarNotificacionesVencimientoUseCase } from "./application/casos-uso/generar-notificaciones-vencimiento.usecase";
import { EscalarAccionesVencidasUseCase } from "./application/casos-uso/escalar-acciones-vencidas.usecase";
import { NotificacionController } from "./infrastructure/notificacion.controller";
import { NotificacionPrismaRepository } from "./infrastructure/notificacion.prisma-repository";
import { crearNotificacionesRouter } from "./infrastructure/notificaciones.router";

export function crearModuloNotificaciones(prisma: PrismaClient, autenticar: RequestHandler) {
  const repo = new NotificacionPrismaRepository(prisma);
  const gestionarUseCase = new GestionarNotificacionesUseCase(repo);
  const generarUseCase = new GenerarNotificacionesVencimientoUseCase(repo);
  const escalarUseCase = new EscalarAccionesVencidasUseCase(repo);
  const controller = new NotificacionController(gestionarUseCase);

  return {
    router: crearNotificacionesRouter(controller, autenticar),
    gestionarUseCase,
    generarUseCase,
    escalarUseCase,
  };
}
