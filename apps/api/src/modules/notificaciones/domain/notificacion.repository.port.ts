import type { Notificacion, ReferenciaNotificacion, TipoNotificacion } from "./notificacion.entity";

export interface DatosCrearNotificacion {
  usuarioId: string;
  empresaId: string;
  tipo: TipoNotificacion;
  referenciaTipo: ReferenciaNotificacion;
  referenciaId: string;
  mensaje: string;
}

export interface FiltrosListarNotificaciones {
  soloNoLeidas?: boolean;
}

export interface NotificacionRepositoryPort {
  listarPorUsuario(usuarioId: string, empresaId: string, filtros: FiltrosListarNotificaciones): Promise<Notificacion[]>;
  contarNoLeidas(usuarioId: string, empresaId: string): Promise<number>;
  marcarLeida(id: string, usuarioId: string): Promise<Notificacion | null>;
  marcarTodasLeidas(usuarioId: string, empresaId: string): Promise<number>;
  crear(datos: DatosCrearNotificacion): Promise<Notificacion>;

  /** Ids de `usuario` con rol `administrador_cliente` para ese cliente, o vacío si no hay ninguno. */
  buscarAdministradoresCliente(clienteId: string, empresaId: string): Promise<string[]>;

  /** Ids de `usuario` con rol `administrador` de la empresa (fallback cuando no hay administrador_cliente). */
  buscarAdministradoresGenerales(empresaId: string): Promise<string[]>;

  /** Invoca `sp_notificacion_generar_vencimientos` — retorna cantidad de notificaciones insertadas. */
  generarVencimientos(): Promise<number>;

  /** Invoca `sp_accion_correctiva_escalar` — retorna cantidad de notificaciones ACCION_ESCALADA insertadas. */
  escalarAccionesVencidas(): Promise<number>;
}
