import type { DatosRegistrarAuditoria, FiltrosAuditoria, RegistroAuditoria } from "./registro-auditoria.entity";

/**
 * Puerto del repositorio de auditoría — **solo** `registrar` y `listar`. No declara
 * `actualizar` ni `eliminar` a propósito: refuerza en el tipo la regla de negocio
 * "RegistroAuditoria es append-only" (ver spec 010-seguridad-privacidad-continuidad).
 */
export interface RegistroAuditoriaRepositoryPort {
  /** Inserta una fila nueva y la retorna. Nunca actualiza ni borra filas existentes. */
  registrar(datos: DatosRegistrarAuditoria): Promise<RegistroAuditoria>;

  /** Lista paginada de la empresa, filtrable por usuario/acción/rango de fechas. */
  listar(
    empresaId: string,
    filtros: FiltrosAuditoria,
    paginacion: { pagina: number; porPagina: number },
  ): Promise<{ items: RegistroAuditoria[]; total: number }>;
}
