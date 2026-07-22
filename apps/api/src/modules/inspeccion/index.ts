import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GestionarPlantillaUseCase } from "./application/casos-uso/gestionar-plantilla.usecase";
import { IniciarCertificacionUseCase } from "./application/casos-uso/iniciar-certificacion.usecase";
import { ResponderCertificacionUseCase } from "./application/casos-uso/responder-certificacion.usecase";
import { SincronizarCapturaOfflineUseCase } from "./application/casos-uso/sincronizar-captura-offline.usecase";
import { FirmarCertificacionUseCase } from "./application/casos-uso/firmar-certificacion.usecase";
import { GestionarHallazgosUseCase } from "./application/casos-uso/gestionar-hallazgos.usecase";
import { GestionarPlanCumplimientoUseCase } from "./application/casos-uso/gestionar-plan-cumplimiento.usecase";
import { GestionarAccionCorrectivaUseCase } from "./application/casos-uso/gestionar-accion-correctiva.usecase";
import { ConsultarSeguimientoUseCase } from "./application/casos-uso/consultar-seguimiento.usecase";
import { PlantillaController } from "./infrastructure/plantilla.controller";
import { CertificacionController } from "./infrastructure/certificacion.controller";
import { HallazgoController } from "./infrastructure/hallazgo.controller";
import { PlanCumplimientoController } from "./infrastructure/plan-cumplimiento.controller";
import { AccionCorrectivaController } from "./infrastructure/accion-correctiva.controller";
import { PlantillaPrismaRepository } from "./infrastructure/plantilla.prisma-repository";
import { CertificacionPrismaRepository } from "./infrastructure/certificacion.prisma-repository";
import { HallazgoPrismaRepository } from "./infrastructure/hallazgo.prisma-repository";
import { PlanCumplimientoPrismaRepository } from "./infrastructure/plan-cumplimiento.prisma-repository";
import { AccionCorrectivaPrismaRepository } from "./infrastructure/accion-correctiva.prisma-repository";
import { AuditoriaPrismaRepository } from "./infrastructure/auditoria.prisma-repository";
import { LocalEvidenciasAdapter } from "./infrastructure/local-evidencias.adapter";
import { SupabaseEvidenciasAdapter } from "./infrastructure/supabase-evidencias.adapter";
import { LocalCertificacionPdfAdapter } from "./infrastructure/local-certificacion-pdf.adapter";
import { SupabaseCertificacionPdfAdapter } from "./infrastructure/supabase-certificacion-pdf.adapter";
import { PdfCertificacionAdapter } from "./infrastructure/pdf-certificacion.adapter";
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
  const almacenamientoPdf = supabase ? new SupabaseCertificacionPdfAdapter(supabase) : new LocalCertificacionPdfAdapter();
  const generadorPdf = new PdfCertificacionAdapter();
  const iniciarUseCase = new IniciarCertificacionUseCase(certificacionRepo, plantillaRepo);
  const responderUseCase = new ResponderCertificacionUseCase(certificacionRepo, almacenamiento);
  const sincronizarUseCase = new SincronizarCapturaOfflineUseCase(certificacionRepo, responderUseCase, registrarEventoAuditoria);

  // Hallazgos y plan de cumplimiento (013-hallazgos-plan-cumplimiento)
  const hallazgoRepo = new HallazgoPrismaRepository(prisma);
  const planCumplimientoRepo = new PlanCumplimientoPrismaRepository(prisma);
  const accionCorrectivaRepo = new AccionCorrectivaPrismaRepository(prisma);

  const firmarUseCase = new FirmarCertificacionUseCase(certificacionRepo, generadorPdf, almacenamientoPdf, hallazgoRepo);
  const certificacionController = new CertificacionController(iniciarUseCase, responderUseCase, sincronizarUseCase, firmarUseCase);

  const hallazgosUseCase = new GestionarHallazgosUseCase(hallazgoRepo, certificacionRepo, almacenamiento);
  const planCumplimientoUseCase = new GestionarPlanCumplimientoUseCase(planCumplimientoRepo, hallazgoRepo, accionCorrectivaRepo, certificacionRepo);
  const accionCorrectivaUseCase = new GestionarAccionCorrectivaUseCase(accionCorrectivaRepo, almacenamiento);
  const seguimientoUseCase = new ConsultarSeguimientoUseCase(accionCorrectivaRepo, hallazgoRepo, planCumplimientoRepo, certificacionRepo);

  const hallazgoController = new HallazgoController(hallazgosUseCase);
  const planCumplimientoController = new PlanCumplimientoController(planCumplimientoUseCase, accionCorrectivaUseCase);
  const accionCorrectivaController = new AccionCorrectivaController(accionCorrectivaUseCase, seguimientoUseCase);

  return {
    router: crearInspeccionRouter(
      plantillaController,
      certificacionController,
      hallazgoController,
      planCumplimientoController,
      accionCorrectivaController,
      autenticar,
      resolverAlcance,
      requiereEnviarRevision,
      requiereAprobarPlantilla,
    ),
  };
}
