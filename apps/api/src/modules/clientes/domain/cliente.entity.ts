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
  creadoEn: Date;
  actualizadoEn: Date;
}

/** Valida formato básico de email sin librerías externas. */
export function validarEmail(email: string): boolean {
  if (!email) return false;
  const RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return RE.test(email);
}

/** Retorna true cuando el cliente puede seleccionarse en nuevos formularios. */
export function puedeSeleccionarse(cliente: Cliente): boolean {
  return cliente.activo;
}
