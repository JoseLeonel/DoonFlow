export type TipoEntidadPrivacidad = "CLIENTE" | "SUCURSAL";

export interface AvisoPrivacidad {
  id: string;
  entidadTipo: TipoEntidadPrivacidad;
  entidadId: string;
  baseLegal: string;
  registradoPorId: string;
  empresaId: string;
  creadoEn: Date;
}
