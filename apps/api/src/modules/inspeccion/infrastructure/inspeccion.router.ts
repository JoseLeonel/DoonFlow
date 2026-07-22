import { Router } from "express";
import type { PlantillaController } from "./plantilla.controller";
import type { CertificacionController } from "./certificacion.controller";
import type { HallazgoController } from "./hallazgo.controller";
import type { PlanCumplimientoController } from "./plan-cumplimiento.controller";
import type { AccionCorrectivaController } from "./accion-correctiva.controller";
import { subidaArchivoEvidencia } from "./subida-archivo.middleware";
import type { RequestHandler } from "express";

export function crearInspeccionRouter(
  ctrl: PlantillaController,
  ctrlCertificacion: CertificacionController,
  ctrlHallazgo: HallazgoController,
  ctrlPlanCumplimiento: PlanCumplimientoController,
  ctrlAccionCorrectiva: AccionCorrectivaController,
  autenticar: RequestHandler,
  resolverAlcance: RequestHandler,
  requiereEnviarRevision: RequestHandler,
  requiereAprobarPlantilla: RequestHandler,
): Router {
  const r = Router();
  r.use(autenticar);

  // Plantillas
  r.get   ("/plantillas",               ctrl.listar);
  r.post  ("/plantillas",               ctrl.crear);
  // Antes de "/plantillas/:id" — si no, "pendientes-aprobacion" se capturaría como :id.
  r.get   ("/plantillas/pendientes-aprobacion", requiereAprobarPlantilla, ctrl.listarPendientesAprobacion);
  r.get   ("/plantillas/:id",           ctrl.obtenerCompleta);
  r.patch ("/plantillas/:id",           ctrl.actualizar);
  r.delete("/plantillas/:id",           ctrl.eliminar);
  r.post  ("/plantillas/:id/activar",   ctrl.activar);
  r.post  ("/plantillas/:id/desactivar",ctrl.desactivar);
  r.post  ("/plantillas/:id/clonar",    ctrl.clonar);

  // Aprobación (007-gobernanza-permisos-aprobacion)
  r.post  ("/plantillas/:id/enviar-revision", requiereEnviarRevision, ctrl.enviarRevision);
  r.post  ("/plantillas/:id/aprobar",         requiereAprobarPlantilla, ctrl.aprobar);
  r.post  ("/plantillas/:id/rechazar",        requiereAprobarPlantilla, ctrl.rechazar);

  // Rangos de resultado
  r.patch ("/plantillas/:id/rangos",            ctrl.guardarRangos);

  // Nodos genéricos (aplica a cualquier nivel: panel o pregunta)
  r.post  ("/plantillas/:id/nodos",             ctrl.crearNodo);
  r.patch ("/plantillas/:id/nodos/reordenar",   ctrl.reordenar);
  r.patch ("/plantillas/:id/nodos/:nodoId",     ctrl.actualizarNodo);
  r.delete("/plantillas/:id/nodos/:nodoId",     ctrl.eliminarNodo);

  // Certificaciones (015-wizard-certificacion) — requieren alcance (Total/Cliente/Sucursal)
  r.post  ("/certificaciones",                    resolverAlcance, ctrlCertificacion.iniciar);
  r.get   ("/certificaciones",                    resolverAlcance, ctrlCertificacion.listar);
  r.get   ("/certificaciones/:id",                resolverAlcance, ctrlCertificacion.obtenerCompleta);
  r.patch ("/certificaciones/:id/respuestas",     resolverAlcance, ctrlCertificacion.guardarRespuestasSeccion);
  r.post  ("/certificaciones/:id/evidencias",     resolverAlcance, subidaArchivoEvidencia, ctrlCertificacion.adjuntarEvidencia);
  r.get   ("/certificaciones/:id/resumen",        resolverAlcance, ctrlCertificacion.obtenerResumen);

  // Captura offline (012-captura-offline-campo)
  r.post  ("/certificaciones/:id/sincronizacion",             resolverAlcance, ctrlCertificacion.sincronizarLote);
  r.post  ("/certificaciones/:id/sincronizacion/evidencias",  resolverAlcance, subidaArchivoEvidencia, ctrlCertificacion.sincronizarEvidencia);
  r.get   ("/certificaciones/:id/sincronizacion/estado",      resolverAlcance, ctrlCertificacion.obtenerEstadoSincronizacion);

  // Firma (005-certificacion-plan-cumplimiento, retomado)
  r.post  ("/certificaciones/:id/firmar",  resolverAlcance, ctrlCertificacion.firmar);
  r.get   ("/certificaciones/:id/pdf",     resolverAlcance, ctrlCertificacion.obtenerPdf);

  // Hallazgos y plan de cumplimiento (013-hallazgos-plan-cumplimiento)
  r.get   ("/certificaciones/:id/evidencias",                  resolverAlcance, ctrlAccionCorrectiva.evidenciasConsolidadas);
  r.get   ("/certificaciones/:id/hallazgos",                   resolverAlcance, ctrlHallazgo.listar);
  r.post  ("/certificaciones/:id/hallazgos",                   resolverAlcance, ctrlHallazgo.crear);
  r.post  ("/certificaciones/:id/hallazgos/generar-automaticos", resolverAlcance, ctrlHallazgo.generarAutomaticos);
  r.patch ("/hallazgos/:id",              ctrlHallazgo.actualizar);
  r.post  ("/hallazgos/:id/evidencias",   subidaArchivoEvidencia, ctrlHallazgo.adjuntarEvidencia);

  r.post  ("/certificaciones/:id/plan-cumplimiento", resolverAlcance, ctrlPlanCumplimiento.generar);
  r.get   ("/certificaciones/:id/plan-cumplimiento", resolverAlcance, ctrlPlanCumplimiento.obtener);
  r.post  ("/plan-cumplimiento/:id/acciones", ctrlPlanCumplimiento.crearAccion);
  r.post  ("/plan-cumplimiento/:id/cerrar",   ctrlPlanCumplimiento.cerrar);
  r.post  ("/plan-cumplimiento/:id/reabrir",  ctrlPlanCumplimiento.reabrir);

  r.get   ("/mis-acciones",               resolverAlcance, ctrlAccionCorrectiva.misAcciones);
  r.get   ("/acciones-en-revision",       resolverAlcance, ctrlAccionCorrectiva.accionesEnRevision);
  r.patch ("/acciones/:id",               ctrlAccionCorrectiva.actualizar);
  r.patch ("/acciones/:id/avance",        resolverAlcance, ctrlAccionCorrectiva.actualizarAvance);
  r.post  ("/acciones/:id/evidencias",    resolverAlcance, subidaArchivoEvidencia, ctrlAccionCorrectiva.adjuntarEvidencia);
  r.post  ("/acciones/:id/enviar-revision", resolverAlcance, ctrlAccionCorrectiva.enviarARevision);
  r.post  ("/acciones/:id/verificar",     ctrlAccionCorrectiva.verificar);

  return r;
}
