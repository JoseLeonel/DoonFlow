export interface EntradaAuditoria {
  plantillaId: string;
  usuarioId: string;
  tabla: string;
  registroId: string;
  accion: string;
  valorAntes?: unknown;
  valorDespues?: unknown;
}

/** Historial de auditoría (RF-12) — reutilizado por 007 para el historial de aprobación de plantillas. */
export interface AuditoriaRepositoryPort {
  registrar(entrada: EntradaAuditoria): Promise<void>;
}
