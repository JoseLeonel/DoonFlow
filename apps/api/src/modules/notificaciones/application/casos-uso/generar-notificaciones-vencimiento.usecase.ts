import type { NotificacionRepositoryPort } from "../../domain/notificacion.repository.port";

/**
 * Job diario (HU-1/HU-2, recordatorios de vencimiento): delega el escaneo agregado en
 * `sp_notificacion_generar_vencimientos` (packages/db/sql/procedimientos/) — caso de uso
 * delgado a propósito, ver CLAUDE.md → Procedimientos almacenados. La notificación
 * `HALLAZGO_CRITICO` no pasa por aquí — se dispara como evento síncrono desde `inspeccion`.
 */
export class GenerarNotificacionesVencimientoUseCase {
  constructor(private readonly repo: NotificacionRepositoryPort) {}

  async ejecutar(): Promise<{ generadas: number }> {
    const generadas = await this.repo.generarVencimientos();
    return { generadas };
  }
}
