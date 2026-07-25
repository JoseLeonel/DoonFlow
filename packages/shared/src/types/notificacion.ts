export type TipoNotificacion =
  | "ACCION_ASIGNADA"
  | "ACCION_POR_VENCER"
  | "ACCION_VENCIDA"
  | "ACCION_ESCALADA"
  | "CERTIFICACION_POR_VENCER"
  | "HALLAZGO_CRITICO";

export type ReferenciaNotificacion = "accion_correctiva" | "inspeccion" | "hallazgo";

export interface Notificacion {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacion;
  referenciaTipo: ReferenciaNotificacion;
  referenciaId: string;
  mensaje: string;
  leidaEn: string | null;
  enviadaPorCorreo: boolean;
  creadoEn: string;
  empresaId: string;
}

export type EstadoCertificadoPublico = "VIGENTE" | "VENCIDA";

export interface CertificadoPublico {
  estado: EstadoCertificadoPublico;
  cliente: string;
  sucursal: string;
  fechaEmision: string;
  fechaVencimiento: string;
  nombrePlantilla: string;
}
