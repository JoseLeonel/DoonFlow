import cron from "node-cron";
import type { GenerarNotificacionesVencimientoUseCase } from "../application/casos-uso/generar-notificaciones-vencimiento.usecase";
import type { EscalarAccionesVencidasUseCase } from "../application/casos-uso/escalar-acciones-vencidas.usecase";

/**
 * Registra el job diario de notificaciones en el cron del proceso: recordatorios de
 * vencimiento (HU-1/HU-2) y luego escalamiento de acciones vencidas (HU-7), en ese orden.
 * Cron por defecto: diario a las 06:00 (configurable vía `NOTIFICACIONES_JOB_CRON`) — antes
 * del horario laboral típico, para que las notificaciones estén listas al empezar el día.
 */
export function iniciarJobNotificaciones(
  generarUseCase: GenerarNotificacionesVencimientoUseCase,
  escalarUseCase: EscalarAccionesVencidasUseCase,
): void {
  const expresionCron = process.env.NOTIFICACIONES_JOB_CRON ?? "0 6 * * *";
  cron.schedule(expresionCron, async () => {
    try {
      const { generadas } = await generarUseCase.ejecutar();
      const { escaladas } = await escalarUseCase.ejecutar();
      console.log(`[notificaciones] Job diario: ${generadas} generada(s), ${escaladas} escalada(s).`);
    } catch (error) {
      console.error("[notificaciones] Job diario falló:", error);
    }
  });
  console.log(`[notificaciones] Job diario programado (cron: "${expresionCron}").`);
}
