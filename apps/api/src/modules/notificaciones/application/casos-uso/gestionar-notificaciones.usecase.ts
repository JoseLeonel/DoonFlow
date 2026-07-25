import { construirMensaje } from "../../domain/notificacion.entity";
import type { ContextoMensaje, TipoNotificacion } from "../../domain/notificacion.entity";
import { NotificacionNoEncontradaError } from "../../domain/notificacion.errors";
import type { FiltrosListarNotificaciones, NotificacionRepositoryPort } from "../../domain/notificacion.repository.port";

/**
 * Consultas y acciones del centro de notificaciones del usuario autenticado, más la creación
 * de eventos síncronos (`ACCION_ASIGNADA`, `HALLAZGO_CRITICO`) disparados desde otros módulos
 * a través del wrapper `RegistradorNotificacion`/`NotificadorCliente` (ver `shared/notificaciones`).
 */
export class GestionarNotificacionesUseCase {
  constructor(private readonly repo: NotificacionRepositoryPort) {}

  listar(usuarioId: string, empresaId: string, filtros: FiltrosListarNotificaciones) {
    return this.repo.listarPorUsuario(usuarioId, empresaId, filtros);
  }

  contarNoLeidas(usuarioId: string, empresaId: string) {
    return this.repo.contarNoLeidas(usuarioId, empresaId);
  }

  async marcarLeida(id: string, usuarioId: string) {
    const actualizada = await this.repo.marcarLeida(id, usuarioId);
    if (!actualizada) throw new NotificacionNoEncontradaError(id);
    return actualizada;
  }

  marcarTodasLeidas(usuarioId: string, empresaId: string) {
    return this.repo.marcarTodasLeidas(usuarioId, empresaId);
  }

  /** Notifica a un único usuario (ej. `ACCION_ASIGNADA` al responsable). */
  notificarUsuario(
    usuarioId: string,
    empresaId: string,
    tipo: TipoNotificacion,
    referenciaTipo: "accion_correctiva" | "inspeccion" | "hallazgo",
    referenciaId: string,
    contexto: ContextoMensaje,
  ) {
    return this.repo.crear({
      usuarioId, empresaId, tipo, referenciaTipo, referenciaId,
      mensaje: construirMensaje(tipo, contexto),
    });
  }

  /**
   * Notifica a los `administrador_cliente` del cliente dueño de la sucursal (ej.
   * `HALLAZGO_CRITICO`); si no hay ninguno asignado, cae al `administrador` de la empresa.
   */
  async notificarCliente(
    clienteId: string,
    empresaId: string,
    tipo: TipoNotificacion,
    referenciaTipo: "accion_correctiva" | "inspeccion" | "hallazgo",
    referenciaId: string,
    contexto: ContextoMensaje,
  ) {
    let destinatarios = await this.repo.buscarAdministradoresCliente(clienteId, empresaId);
    if (destinatarios.length === 0) destinatarios = await this.repo.buscarAdministradoresGenerales(empresaId);

    const mensaje = construirMensaje(tipo, contexto);
    await Promise.all(
      destinatarios.map((usuarioId) =>
        this.repo.crear({ usuarioId, empresaId, tipo, referenciaTipo, referenciaId, mensaje }),
      ),
    );
  }
}
