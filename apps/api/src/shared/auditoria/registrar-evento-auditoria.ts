import type { RegistrarAuditoriaUseCase } from "../../modules/auditoria/application/casos-uso/registrar-auditoria.usecase";

export interface EventoAuditoria {
  empresaId: string;
  usuarioId: string;
  accion: string;
  entidadTipo: string;
  entidadId: string;
  valorAntes?: unknown;
  valorDespues?: unknown;
  ip?: string | null;
}

export type RegistradorEventoAuditoria = (evento: EventoAuditoria) => Promise<void>;

/**
 * Envuelve `RegistrarAuditoriaUseCase` para que casos de uso de **otros** módulos (auth,
 * permisos, clientes, sucursales) escriban un `RegistroAuditoria` sin instanciar el
 * repositorio de auditoría por su cuenta. Un fallo al auditar nunca debe romper la operación
 * de negocio original — se registra en consola y se ignora silenciosamente.
 *
 * Puntos de integración de este sprint (010-seguridad-privacidad-continuidad):
 * - Login exitoso/fallido → `modules/auth/application/casos-uso/iniciar-sesion.usecase.ts` (`LOGIN`/`LOGIN_FALLIDO`).
 * - Cambios de permisos de rol → `modules/permisos/.../gestionar-matriz-permisos.usecase.ts` (`PERMISO_MODIFICADO`).
 * - Desactivación de usuario/cliente/sucursal → sus respectivos casos de uso (`USUARIO_DESACTIVADO`, `CLIENTE_DESACTIVADO`, `SUCURSAL_DESACTIVADO`).
 * - Purgado por retención → `modules/retencion/infrastructure/job-purgar-retencion.job.ts` (`RETENCION_ANONIMIZADO`/`RETENCION_ELIMINADO`).
 * - **⏸️ Bloqueados** (dependen de 005-certificacion-plan-cumplimiento, pausado): firma de
 *   certificación (`CERTIFICACION_FIRMADA`) y cierre de plan de cumplimiento (`PLAN_CERRADO`,
 *   depende de 013, que a su vez depende de 005) — no hay caso de uso todavía donde agregar la llamada.
 *
 * @example
 *   const registrarEventoAuditoria = crearRegistradorEventoAuditoria(moduloAuditoria.registrarUseCase);
 *   await registrarEventoAuditoria({ empresaId, usuarioId, accion: "LOGIN", entidadTipo: "usuario", entidadId: usuarioId });
 */
export function crearRegistradorEventoAuditoria(useCase: RegistrarAuditoriaUseCase): RegistradorEventoAuditoria {
  return async function registrarEventoAuditoria(evento: EventoAuditoria): Promise<void> {
    try {
      await useCase.registrar(evento);
    } catch (error) {
      console.error(`[auditoria] No se pudo registrar el evento "${evento.accion}":`, error);
    }
  };
}
