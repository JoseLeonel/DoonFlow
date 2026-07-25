import type { ContextoMensaje, ReferenciaNotificacion, TipoNotificacion } from "../../modules/notificaciones/domain/notificacion.entity";
import type { GestionarNotificacionesUseCase } from "../../modules/notificaciones/application/casos-uso/gestionar-notificaciones.usecase";

export interface EventoNotificacionUsuario {
  usuarioId: string;
  empresaId: string;
  tipo: TipoNotificacion;
  referenciaTipo: ReferenciaNotificacion;
  referenciaId: string;
  contexto: ContextoMensaje;
}

export interface EventoNotificacionCliente {
  clienteId: string;
  empresaId: string;
  tipo: TipoNotificacion;
  referenciaTipo: ReferenciaNotificacion;
  referenciaId: string;
  contexto: ContextoMensaje;
}

export type RegistradorNotificacion = (evento: EventoNotificacionUsuario) => Promise<void>;
export type NotificadorCliente = (evento: EventoNotificacionCliente) => Promise<void>;

/**
 * Envuelve `GestionarNotificacionesUseCase` para que casos de uso de **otros** módulos
 * (`inspeccion`) disparen una notificación in-app sin instanciar el repositorio de
 * notificaciones por su cuenta — mismo patrón que `crearRegistradorEventoAuditoria` (010).
 * Un fallo al notificar nunca debe romper la operación de negocio original.
 *
 * Puntos de integración de este sprint (006-vigencia-notificaciones-portal):
 * - `ACCION_ASIGNADA` → `modules/inspeccion/.../gestionar-accion-correctiva.usecase.ts` (`crear`), un único destinatario (el responsable).
 * - `HALLAZGO_CRITICO` → `modules/inspeccion/.../gestionar-hallazgos.usecase.ts` (`crearManual`/`generarAutomaticos`), fan-out por cliente.
 *
 * @example
 *   const registrarNotificacion = crearRegistradorNotificacion(moduloNotificaciones.gestionarUseCase);
 *   await registrarNotificacion({ usuarioId, empresaId, tipo: "ACCION_ASIGNADA", referenciaTipo: "accion_correctiva", referenciaId, contexto: { descripcionAccion } });
 */
export function crearRegistradorNotificacion(useCase: GestionarNotificacionesUseCase): RegistradorNotificacion {
  return async function registrarNotificacion(evento: EventoNotificacionUsuario): Promise<void> {
    try {
      await useCase.notificarUsuario(evento.usuarioId, evento.empresaId, evento.tipo, evento.referenciaTipo, evento.referenciaId, evento.contexto);
    } catch (error) {
      console.error(`[notificaciones] No se pudo registrar el evento "${evento.tipo}":`, error);
    }
  };
}

/** Variante de fan-out por cliente (administrador_cliente, con fallback a administrador). */
export function crearNotificadorCliente(useCase: GestionarNotificacionesUseCase): NotificadorCliente {
  return async function notificarCliente(evento: EventoNotificacionCliente): Promise<void> {
    try {
      await useCase.notificarCliente(evento.clienteId, evento.empresaId, evento.tipo, evento.referenciaTipo, evento.referenciaId, evento.contexto);
    } catch (error) {
      console.error(`[notificaciones] No se pudo notificar al cliente para el evento "${evento.tipo}":`, error);
    }
  };
}
