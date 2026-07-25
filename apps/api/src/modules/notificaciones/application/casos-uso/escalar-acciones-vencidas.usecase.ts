import type { NotificacionRepositoryPort } from "../../domain/notificacion.repository.port";

/** Job diario (HU-7, escalamiento): delega el escaneo en `sp_accion_correctiva_escalar`. */
export class EscalarAccionesVencidasUseCase {
  constructor(private readonly repo: NotificacionRepositoryPort) {}

  async ejecutar(): Promise<{ escaladas: number }> {
    const escaladas = await this.repo.escalarAccionesVencidas();
    return { escaladas };
  }
}
