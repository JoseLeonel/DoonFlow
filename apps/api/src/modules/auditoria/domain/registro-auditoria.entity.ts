/**
 * RegistroAuditoria — bitácora append-only de acciones críticas del sistema (login,
 * cambios de permisos, desactivaciones, purgado por retención). Generaliza
 * `InspeccionAuditoria` (solo plantillas BPM) a cualquier módulo.
 *
 * @example
 *   { accion: "LOGIN", entidadTipo: "usuario", entidadId: "u1", ... }
 */
export interface RegistroAuditoria {
  id: string;
  empresaId: string;
  usuarioId: string;
  accion: string;
  entidadTipo: string;
  entidadId: string;
  valorAntes: unknown | null;
  valorDespues: unknown | null;
  ip: string | null;
  creadoEn: Date;
}

export interface DatosRegistrarAuditoria {
  empresaId: string;
  usuarioId: string;
  accion: string;
  entidadTipo: string;
  entidadId: string;
  valorAntes?: unknown | null;
  valorDespues?: unknown | null;
  ip?: string | null;
}

export interface FiltrosAuditoria {
  usuarioId?: string;
  accion?: string;
  desde?: Date;
  hasta?: Date;
}
