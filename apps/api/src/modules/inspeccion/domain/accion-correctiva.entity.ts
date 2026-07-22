/**
 * AccionCorrectiva — acción correctiva de un hallazgo dentro de un plan de cumplimiento
 * (013-hallazgos-plan-cumplimiento). Sin dependencias de Express/Prisma.
 *
 * `VENCIDO` de este sprint es la única fuente de verdad de vencimiento: se calcula en el
 * momento de la lectura (`calcularEstadoEfectivo`, aplicado por el repositorio Prisma a cada
 * fila devuelta), no vía job programado. El campo `estado` persistido en BD puede quedar
 * desactualizado hasta la próxima lectura — aceptable porque ninguna regla de negocio depende
 * de que `VENCIDO` esté persistido de inmediato. Las notificaciones de vencimiento próximo
 * quedan fuera de este sprint (ver [[006-vigencia-notificaciones-portal]]) — no implementar
 * ningún cron/job aquí.
 */

export type EstadoAccion = "PENDIENTE" | "EN_PROCESO" | "EN_REVISION" | "CUMPLIDO" | "NO_CUMPLIDO" | "VENCIDO";

const ESTADOS_TERMINALES: EstadoAccion[] = ["CUMPLIDO", "NO_CUMPLIDO"];
const ROLES_VERIFICADORES = ["administrador", "auditor"];

export interface AccionCorrectiva {
  id: string;
  planCumplimientoId: string;
  hallazgoId: string;
  descripcion: string;
  responsableId: string;
  fechaLimite: Date;
  estado: EstadoAccion;
  porcentajeAvance: number;
  verificadoPorId: string | null;
  verificadoEn: Date | null;
  comentarioVerificacion: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Calcula el estado "efectivo" de una acción correctiva: si su `fechaLimite` ya pasó y su
 * estado persistido no es terminal (`CUMPLIDO`/`NO_CUMPLIDO`), se considera `VENCIDO` aunque
 * la columna en BD todavía diga `PENDIENTE`/`EN_PROCESO`/`EN_REVISION`.
 *
 * @param accion - Acción con su `fechaLimite` y `estado` persistido.
 * @param ahora - Instante de referencia (por defecto, ahora mismo — parametrizable para tests).
 * @returns El estado persistido, o `"VENCIDO"` si corresponde.
 * @example
 *   calcularEstadoEfectivo({ fechaLimite: new Date("2020-01-01"), estado: "PENDIENTE" }) // → "VENCIDO"
 *   calcularEstadoEfectivo({ fechaLimite: new Date("2020-01-01"), estado: "CUMPLIDO" })   // → "CUMPLIDO"
 */
export function calcularEstadoEfectivo(
  accion: Pick<AccionCorrectiva, "fechaLimite" | "estado">,
  ahora: Date = new Date(),
): EstadoAccion {
  if (ESTADOS_TERMINALES.includes(accion.estado)) return accion.estado;
  return accion.fechaLimite < ahora ? "VENCIDO" : accion.estado;
}

/**
 * Indica si un usuario puede actualizar el avance de una acción correctiva: solo su propio
 * responsable, o un administrador (general o de cliente) cuyo alcance cubra la sucursal de la
 * certificación de origen (regla 6 de 005, verificada en este sprint).
 *
 * @param accion - Acción con su `responsableId`.
 * @param usuarioId - Usuario autenticado que intenta actualizar el avance.
 * @param esAdminConAlcance - Ya resuelto por el caso de uso (requiere consultar la sucursal
 *   de la certificación de origen, fuera del alcance de una función de dominio pura).
 * @returns `true` si el usuario puede actualizar el avance.
 * @example
 *   puedeActualizarAvance({ responsableId: "u1" }, "u1", false) // → true
 *   puedeActualizarAvance({ responsableId: "u1" }, "u2", false) // → false
 *   puedeActualizarAvance({ responsableId: "u1" }, "u2", true)  // → true
 */
export function puedeActualizarAvance(
  accion: Pick<AccionCorrectiva, "responsableId">,
  usuarioId: string,
  esAdminConAlcance: boolean,
): boolean {
  return accion.responsableId === usuarioId || esAdminConAlcance;
}

/**
 * Indica si un usuario puede verificar una acción correctiva o cerrar/reabrir un plan de
 * cumplimiento (regla 4 de 013): solo el rol `auditor` o `administrador` — nunca el propio
 * `usuario_sucursal`, ni siquiera sobre su propia acción (no autoverificación).
 *
 * @param usuario - Usuario autenticado, con su `rol`.
 * @returns `true` si el rol está autorizado a verificar.
 * @example
 *   puedeVerificar({ rol: "auditor" })         // → true
 *   puedeVerificar({ rol: "usuario_sucursal" }) // → false
 */
export function puedeVerificar(usuario: { rol: string }): boolean {
  return ROLES_VERIFICADORES.includes(usuario.rol);
}

/**
 * Aplica la transición de estado que corresponde al resultado de una verificación.
 *
 * @param resultado - Resultado decidido por el auditor.
 * @returns `"CUMPLIDO"` si el resultado fue `CUMPLIDO`; `"EN_PROCESO"` si fue `NO_CUMPLIDO`
 *   (permite al responsable retomar la acción, con posibilidad de ajustar la fecha límite).
 * @example
 *   transicionarPorVerificacion("CUMPLIDO")    // → "CUMPLIDO"
 *   transicionarPorVerificacion("NO_CUMPLIDO") // → "EN_PROCESO"
 */
export function transicionarPorVerificacion(resultado: "CUMPLIDO" | "NO_CUMPLIDO"): EstadoAccion {
  return resultado === "CUMPLIDO" ? "CUMPLIDO" : "EN_PROCESO";
}
