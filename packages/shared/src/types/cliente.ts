export interface Cliente {
  id: string;
  empresaId: string;
  nombreResponsable: string;
  empresa: string;
  identificacionEmpresa?: string | null;
  correo1: string;
  correo2?: string | null;
  correo3?: string | null;
  direccion?: string | null;
  movil?: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}
