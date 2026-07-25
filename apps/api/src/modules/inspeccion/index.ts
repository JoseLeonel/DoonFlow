import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GestionarPlantillaUseCase } from "./application/casos-uso/gestionar-plantilla.usecase";
import { IniciarCertificacionUseCase } from "./application/casos-uso/iniciar-certificacion.usecase";
import { ResponderCertificacionUseCase } from "./application/casos-uso/responder-certificacion.usecase";
import { SincronizarCapturaOfflineUseCase } from "./application/casos-uso/sincronizar-captura-offline.usecase";
import { FirmarCertificacionUseCase } from "./application/casos-uso/firmar-certificacion.usecase";
import { FinalizarCertificacionUseCase } from "./application/casos-uso/finalizar-certificacion.usecase";
import { AceptarCertificacionUseCase } from "./application/casos-uso/aceptar-certificacion.usecase";
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
import type { RegistradorNotificacion, NotificadorCliente } from "../../shared/notificaciones/registrar-notificacion";
import type { MarcadorPlanEjecutado } from "../../shared/planificacion/marcar-plan-ejecutado";
import { recalcularResultadoFinalExcluyendoAnulados } from "./domain/hallazgo.entity";
import type { PuertoCertificacionParaApelaciones } from "../apelaciones/domain/puerto-certificacion.port";
import type { AlcanceConsulta } from "./domain/certificacion.repository.port";

export function crearModuloInspeccion(
  prisma: PrismaClient,
  autenticar: RequestHandler,
  resolverAlcance: RequestHandler,
  supabase: SupabaseClient | null,
  requiereEnviarRevision: RequestHandler,
  requiereAprobarPlantilla: RequestHandler,
  registrarEventoAuditoria?: RegistradorEventoAuditoria,
  registrarNotificacion?: RegistradorNotificacion,
  notificarCliente?: NotificadorCliente,
  marcarPlanEjecutado?: MarcadorPlanEjecutado,
) {
  const plantillaRepo = new PlantillaPrismaRepository(prisma);
  const auditoriaRepo = new AuditoriaPrismaRepository(prisma);
  const plantillaUseCase = new GestionarPlantillaUseCase(plantillaRepo, auditoriaRepo);
  const plantillaController = new PlantillaController(plantillaUseCase);

  const certificacionRepo = new CertificacionPrismaRepository(prisma);
  const almacenamiento = supabase ? new SupabaseEvidenciasAdapter(supabase) : new LocalEvidenciasAdapter();
  const almacenamientoPdf = supabase ? new SupabaseCertificacionPdfAdapter(supabase) : new LocalCertificacionPdfAdapter();
  const generadorPdf = new PdfCertificacionAdapter();
  const iniciarUseCase = new IniciarCertificacionUseCase(certificacionRepo, plantillaRepo, marcarPlanEjecutado);
  const responderUseCase = new ResponderCertificacionUseCase(certificacionRepo, almacenamiento);
  const sincronizarUseCase = new SincronizarCapturaOfflineUseCase(certificacionRepo, responderUseCase, registrarEventoAuditoria);

  // Hallazgos y plan de cumplimiento (013-hallazgos-plan-cumplimiento)
  const hallazgoRepo = new HallazgoPrismaRepository(prisma);
  const planCumplimientoRepo = new PlanCumplimientoPrismaRepository(prisma);
  const accionCorrectivaRepo = new AccionCorrectivaPrismaRepository(prisma);

  const hallazgosUseCase = new GestionarHallazgosUseCase(hallazgoRepo, certificacionRepo, almacenamiento, notificarCliente);
  const firmarUseCase = new FirmarCertificacionUseCase(certificacionRepo, generadorPdf, almacenamientoPdf, hallazgoRepo, hallazgosUseCase);
  const aceptarUseCase = new AceptarCertificacionUseCase(certificacionRepo);
  const finalizarUseCase = new FinalizarCertificacionUseCase(certificacionRepo, hallazgosUseCase);
  const certificacionController = new CertificacionController(iniciarUseCase, responderUseCase, sincronizarUseCase, firmarUseCase, aceptarUseCase, finalizarUseCase);

  const planCumplimientoUseCase = new GestionarPlanCumplimientoUseCase(planCumplimientoRepo, hallazgoRepo, accionCorrectivaRepo, certificacionRepo);
  const accionCorrectivaUseCase = new GestionarAccionCorrectivaUseCase(accionCorrectivaRepo, almacenamiento, registrarNotificacion);
  const seguimientoUseCase = new ConsultarSeguimientoUseCase(accionCorrectivaRepo, hallazgoRepo, planCumplimientoRepo, certificacionRepo);

  const hallazgoController = new HallazgoController(hallazgosUseCase);
  const planCumplimientoController = new PlanCumplimientoController(planCumplimientoUseCase, accionCorrectivaUseCase);
  const accionCorrectivaController = new AccionCorrectivaController(accionCorrectivaUseCase, seguimientoUseCase);

  // Puerto consumido por el módulo `apelaciones` (011-aceptacion-apelaciones-certificacion) —
  // nunca expone los repositorios Prisma directamente, solo estas operaciones puntuales.
  const puertoParaApelaciones: PuertoCertificacionParaApelaciones = {
    async obtenerCertificacion(id, empresaId, alcance) {
      const certificacion = await certificacionRepo.obtenerCompleta(id, empresaId, alcance as AlcanceConsulta | undefined);
      if (!certificacion) return null;
      return {
        id: certificacion.id,
        estado: certificacion.estado,
        firmadoEn: certificacion.firmadoEn,
        firmadoPorId: certificacion.firmadoPorId,
        fechaVencimiento: certificacion.fechaVencimiento,
      };
    },
    async obtenerHallazgo(id, empresaId) {
      const hallazgo = await hallazgoRepo.obtenerPorId(id, empresaId);
      if (!hallazgo) return null;
      return { id: hallazgo.id, inspeccionId: hallazgo.inspeccionId, estado: hallazgo.estado };
    },
    async anularHallazgoPorApelacion(hallazgoId, empresaId) {
      await hallazgoRepo.anularPorApelacion(hallazgoId, empresaId);
    },
    async recalcularResultadoFinal(inspeccionId, empresaId) {
      const hallazgos = await hallazgoRepo.listarPorInspeccion(inspeccionId, empresaId);
      const resultadoFinal = recalcularResultadoFinalExcluyendoAnulados(hallazgos);
      await certificacionRepo.actualizarResultadoFinal(inspeccionId, resultadoFinal);
    },
  };

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
    puertoParaApelaciones,
  };
}
