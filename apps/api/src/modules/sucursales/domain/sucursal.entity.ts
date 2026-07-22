export interface Sucursal {
  id: string;
  empresaId: string;
  clienteId: string;
  nombre: string;
  direccion?: string | null;
  correo?: string | null;
  movil?: string | null;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

/** Valida formato básico de email sin librerías externas. */
export function validarCorreo(correo: string): boolean {
  if (!correo) return false;
  const RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return RE.test(correo);
}

/** Una sucursal inactiva no puede seleccionarse para iniciar una nueva inspección. */
export function puedeSeleccionarse(sucursal: Sucursal): boolean {
  return sucursal.activo;
}
