export type TipoApelacion = "SOBRE_HALLAZGO" | "SOBRE_RESULTADO";
export type EstadoApelacion = "ABIERTA" | "EN_REVISION" | "ACEPTADA" | "RECHAZADA";

export interface Apelacion {
  id: string;
  empresaId: string;
  inspeccionId: string;
  hallazgoId: string | null;
  tipo: TipoApelacion;
  motivo: string;
  solicitadoPorId: string;
  solicitadoEn: string;
  estado: EstadoApelacion;
  resueltoPorId: string | null;
  resueltoEn: string | null;
  resolucionComentario: string | null;
  solicitadoPorNombre: string;
  inspeccionEtiqueta: string;
}
