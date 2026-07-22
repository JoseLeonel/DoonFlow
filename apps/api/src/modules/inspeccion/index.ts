import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GestionarPlantillaUseCase } from "./application/casos-uso/gestionar-plantilla.usecase";
import { IniciarCertificacionUseCase } from "./application/casos-uso/iniciar-certificacion.usecase";
import { ResponderCertificacionUseCase } from "./application/casos-uso/responder-certificacion.usecase";
import { SincronizarCapturaOfflineUseCase } from "./application/casos-uso/sincronizar-captura-offline.usecase";
import { PlantillaController } from "./infrastructure/plantilla.controller";
import { CertificacionController } from "./infrastructure/certificacion.controller";
import { PlantillaPrismaRepository } from "./infrastructure/plantilla.prisma-repository";
import { CertificacionPrismaRepository } from "./infrastructure/certificacion.prisma-repository";
import { AuditoriaPrismaRepository } from "./infrastructure/auditoria.prisma-repository";
import { LocalEvidenciasAdapter } from "./infrastructure/local-evidencias.adapter";
import { SupabaseEvidenciasAdapter } from "./infrastructure/supabase-evidencias.adapter";
import { crearInspeccionRouter } from "./infrastructure/inspeccion.router";
import type { RegistradorEventoAuditoria } from "../../shared/auditoria/registrar-evento-auditoria";

export function crearModuloInspeccion(
  prisma: PrismaClient,
  autenticar: RequestHandler,
  resolverAlcance: RequestHandler,
  supabase: SupabaseClient | null,
  requiereEnviarRevision: RequestHandler,
  requiereAprobarPlantilla: RequestHandler,
  registrarEventoAuditoria?: RegistradorEventoAuditoria,
) {
  const plantillaRepo = new PlantillaPrismaRepository(prisma);
  const auditoriaRepo = new AuditoriaPrismaRepository(prisma);
  const plantillaUseCase = new GestionarPlantillaUseCase(plantillaRepo, auditoriaRepo);
  const plantillaController = new PlantillaController(plantillaUseCase);

  const certificacionRepo = new CertificacionPrismaRepository(prisma);
  const almacenamiento = supabase ? new SupabaseEvidenciasAdapter(supabase) : new LocalEvidenciasAdapter();
  const iniciarUseCase = new IniciarCertificacionUseCase(certificacionRepo, plantillaRepo);
  const responderUseCase = new ResponderCertificacionUseCase(certificacionRepo, almacenamiento);
  const sincronizarUseCase = new SincronizarCapturaOfflineUseCase(certificacionRepo, responderUseCase, registrarEventoAuditoria);
  const certificacionController = new CertificacionController(iniciarUseCase, responderUseCase, sincronizarUseCase);

  return {
    router: crearInspeccionRouter(
      plantillaController,
      certificacionController,
      autenticar,
      resolverAlcance,
      requiereEnviarRevision,
      requiereAprobarPlantilla,
    ),
  };
}
