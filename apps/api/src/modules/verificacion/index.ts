import type { PrismaClient } from "@prisma/client";
import { VerificarCertificadoUseCase } from "./application/casos-uso/verificar-certificado.usecase";
import { VerificacionController } from "./infrastructure/verificacion.controller";
import { VerificacionPrismaRepository } from "./infrastructure/verificacion.prisma-repository";
import { crearVerificacionRouter } from "./infrastructure/verificacion.router";

/** Única factory de módulo del proyecto sin `autenticar` — portal público, ver spec 006 → regla 2. */
export function crearModuloVerificacion(prisma: PrismaClient) {
  const repo = new VerificacionPrismaRepository(prisma);
  const useCase = new VerificarCertificadoUseCase(repo);
  const controller = new VerificacionController(useCase);

  return { router: crearVerificacionRouter(controller), useCase };
}
