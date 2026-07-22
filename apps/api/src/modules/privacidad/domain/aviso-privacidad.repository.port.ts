import type { AvisoPrivacidad, TipoEntidadPrivacidad } from "./aviso-privacidad.entity";

export interface DatosRegistrarAvisoPrivacidad {
  entidadTipo: TipoEntidadPrivacidad;
  entidadId: string;
  baseLegal: string;
  registradoPorId: string;
  empresaId: string;
}

export interface AvisoPrivacidadRepositoryPort {
  registrar(datos: DatosRegistrarAvisoPrivacidad): Promise<AvisoPrivacidad>;
  listarPorEntidad(entidadTipo: TipoEntidadPrivacidad, entidadId: string): Promise<AvisoPrivacidad[]>;
}
