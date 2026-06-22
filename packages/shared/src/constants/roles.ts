/**
 * Roles fijos del sistema (ver CLAUDE.md → "Usuarios y Roles").
 * No se crean roles nuevos sin pasar por agente-arquitecto: afecta a todos los módulos.
 */
export const ROL_ADMIN = "administrador";
export const ROL_PRODUCTOR = "productor";
export const ROL_OPERARIO = "operario";
export const ROL_AUDITOR = "auditor";
export const ROL_CLIENTE_EXTERNO = "cliente_externo";

export const ROLES_SISTEMA = [
  ROL_ADMIN,
  ROL_PRODUCTOR,
  ROL_OPERARIO,
  ROL_AUDITOR,
  ROL_CLIENTE_EXTERNO,
] as const;

export type RolSistema = (typeof ROLES_SISTEMA)[number];
