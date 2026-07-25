/**
 * HallazgoFrecuente — catálogo de conveniencia de hallazgos/acciones correctivas repetidos
 * (014-panel-calendario-biblioteca, HU-6). Nunca se referencia por FK desde `Hallazgo` (se
 * copia el texto al usarla, regla 3 de la spec). Sin dependencias de Express/Prisma.
 */

export type SeveridadSugerida = "CRITICA" | "MAYOR" | "MENOR";

export interface HallazgoFrecuente {
  id: string;
  descripcionHallazgo: string;
  severidadSugerida: SeveridadSugerida;
  descripcionAccionSugerida: string | null;
  activo: boolean;
  empresaId: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Indica si un hallazgo frecuente puede ofrecerse en el selector de biblioteca — solo si está activo.
 *
 * @param hf - Hallazgo frecuente con su `activo` actual.
 * @returns `true` si `activo === true`.
 * @example
 *   puedeSeleccionarse({ activo: true } as HallazgoFrecuente)   // → true
 *   puedeSeleccionarse({ activo: false } as HallazgoFrecuente)  // → false
 */
export function puedeSeleccionarse(hf: Pick<HallazgoFrecuente, "activo">): boolean {
  return hf.activo;
}
