export interface Sucursal {
  id: string;
  empresaId: string;
  clienteId: string;
  nombre: string;
  direccion?: string | null;
  correo?: string | null;
  movil?: string | null;
  activo: boolean;
  puntajeVigente?: number | null;
  clasificacionVigente?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface RegistroCertificacion {
  fecha: string;
  plantillaNombre: string;
  puntajeObtenido: number;
  puntajeMaximo: number;
  clasificacion: string | null;
}
