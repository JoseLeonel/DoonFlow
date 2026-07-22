export class PlantillaNoEncontradaError extends Error {
  constructor(id: string) { super(`Plantilla ${id} no encontrada.`); }
}
export class PlantillaInactivaError extends Error {
  constructor() { super("La plantilla está inactiva o fuera de vigencia."); }
}
export class PlantillaConInspeccionesError extends Error {
  constructor() { super("No se puede eliminar una plantilla con inspecciones registradas."); }
}
export class RangosInvalidosError extends Error {
  constructor(detalle: string) { super(`Rangos de resultado inválidos: ${detalle}`); }
}
export class InspeccionNoEncontradaError extends Error {
  constructor(id: string) { super(`Inspección ${id} no encontrada.`); }
}

// ── Certificación (015-wizard-certificacion) ────────────────────────────────
// 013 amplía este mismo archivo con los errores de hallazgos/plan/acciones cuando 005 se retome.

export class CertificacionNoEditableError extends Error {
  constructor() { super("Esta certificación ya no admite cambios."); }
}
export class SucursalRequeridaError extends Error {
  constructor() { super("Se requiere una sucursal para iniciar la certificación."); }
}
export class SucursalFueraDeAlcanceError extends Error {
  constructor() { super("No tiene acceso a esta sucursal."); }
}
export class ArchivoNoPermitidoError extends Error {
  constructor() { super("Tipo de archivo o tamaño no permitido (máx. 10MB, jpg/png/heic/pdf/doc/docx)."); }
}

// ── Captura offline (012-captura-offline-campo) ────────────────────────────

export class SincronizacionPendienteError extends Error {
  constructor(pendientes: number) { super(`No se puede firmar: hay ${pendientes} respuestas o evidencias sin sincronizar.`); }
}
export class LoteSincronizacionExcedeLimiteError extends Error {
  constructor(limite: number) { super(`El lote excede el máximo de ${limite} respuestas por solicitud.`); }
}
export class RespuestaNoSincronizadaError extends Error {
  constructor(nodoId: string) { super(`La respuesta del nodo ${nodoId} todavía no se sincronizó — sincroniza las respuestas antes que sus evidencias.`); }
}

// ── Firma de certificación (005-certificacion-plan-cumplimiento, retomado) ─

export class CodigoVerificacionEnColisionError extends Error {
  constructor() { super("No se pudo generar un código de verificación único tras varios intentos."); }
}

// ── Aprobación de plantillas (007-gobernanza-permisos-aprobacion) ──────────

export class PlantillaSinPreguntasError extends Error {
  constructor() { super("La ficha no tiene preguntas todavía."); }
}
export class EstadoAprobacionInvalidoError extends Error {
  constructor() { super("La plantilla no está en el estado esperado para esta acción."); }
}
export class ComentarioResolucionRequeridoError extends Error {
  constructor() { super("Debes indicar un comentario para rechazar la plantilla."); }
}

// ── Hallazgos y plan de cumplimiento (013-hallazgos-plan-cumplimiento) ────

export class CertificacionConHallazgoCriticoError extends Error {
  constructor() { super("No se puede firmar: hay hallazgos críticos sin resolver."); }
}
export class HallazgoNoEncontradoError extends Error {
  constructor(id: string) { super(`Hallazgo ${id} no encontrado.`); }
}
export class PlanCumplimientoYaExisteError extends Error {
  constructor() { super("Esta certificación ya tiene un plan de cumplimiento."); }
}
export class PlanCumplimientoNoEncontradoError extends Error {
  constructor(id: string) { super(`Plan de cumplimiento ${id} no encontrado.`); }
}
export class PlanCumplimientoSinHallazgosError extends Error {
  constructor() { super("No se puede generar un plan de cumplimiento sin al menos un hallazgo."); }
}
export class PlanCumplimientoConHallazgosSinAccionError extends Error {
  constructor() { super("Hay hallazgos sin ninguna acción cumplida; no se puede cerrar el plan."); }
}
export class AccionCorrectivaNoEncontradaError extends Error {
  constructor(id: string) { super(`Acción correctiva ${id} no encontrada.`); }
}
export class SinPermisoVerificacionError extends Error {
  constructor() { super("Solo un auditor o administrador con alcance puede verificar esta acción."); }
}
export class SinPermisoActualizarAvanceError extends Error {
  constructor() { super("Solo el responsable de la acción (o un administrador con alcance) puede actualizar su avance."); }
}
