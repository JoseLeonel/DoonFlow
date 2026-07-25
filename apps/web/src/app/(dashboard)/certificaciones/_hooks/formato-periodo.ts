import { formatearFechaCalendario } from "@doonflow/shared";

/**
 * Formatea el período auditado por una certificación a partir de `fechaInicioPeriodo`/
 * `fechaFinPeriodo` (rango de fechas real, 2026-07-24). Cae a `periodoEtiqueta` (texto libre)
 * solo para certificaciones creadas antes del cambio, que no tienen fechas.
 */
export function formatearPeriodoCertificacion(datos: {
  fechaInicioPeriodo: string | null;
  fechaFinPeriodo: string | null;
  periodoEtiqueta: string | null;
}): string {
  if (datos.fechaInicioPeriodo && datos.fechaFinPeriodo) {
    const desde = formatearFechaCalendario(datos.fechaInicioPeriodo);
    const hasta = formatearFechaCalendario(datos.fechaFinPeriodo);
    return `${desde} – ${hasta}`;
  }
  return datos.periodoEtiqueta ?? "—";
}
