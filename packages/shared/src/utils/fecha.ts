/**
 * Formatea un valor de fecha-calendario (columnas Postgres `@db.Date`, sin componente de hora:
 * `fechaLimite`, `fechaVencimiento`, `fechaInicioPeriodo`/`fechaFinPeriodo`, `fechaObjetivo`) para
 * mostrarlo al usuario.
 *
 * Postgres/Prisma devuelven estas columnas como un `Date` de JS a medianoche UTC. Formatearlas
 * con `toLocaleDateString()` sin fijar el huso horario hace que el navegador las convierta a la
 * hora LOCAL antes de mostrarlas — en cualquier huso detrás de UTC (ej. Costa Rica, UTC-6) el
 * resultado sale un día antes del que realmente se guardó (bug real encontrado en pruebas
 * manuales, 2026-07-24: un período "01/07 – 31/07" se mostraba como "30/6 – 30/7"). Se fuerza
 * `timeZone: "UTC"` para leer el mismo día calendario que se guardó, sin importar el huso del
 * navegador/servidor.
 *
 * No usar para columnas `DateTime` reales con hora significativa (`creadoEn`, `firmadoEn`,
 * `solicitadoEn`, etc.) — esas sí deben mostrarse en hora local.
 *
 * @example
 *   formatearFechaCalendario("2026-09-30T00:00:00.000Z") // → "30/9/2026" (sin importar el huso local)
 */
export function formatearFechaCalendario(fecha: Date | string, locale = "es-CR"): string {
  const valor = typeof fecha === "string" ? new Date(fecha) : fecha;
  return valor.toLocaleDateString(locale, { timeZone: "UTC" });
}
