import cron from "node-cron";
import type { PrismaClient } from "@prisma/client";
import type { RegistradorEventoAuditoria } from "../../../shared/auditoria/registrar-evento-auditoria";

interface FilaPurgada {
  tabla: string;
  id: string;
  accion_aplicada: string;
}

/**
 * Purga diariamente los datos operativos vencidos según `politica_retencion`, por cada
 * empresa activa. Invoca `sp_retencion_purgar_datos` (packages/db/sql/procedimientos/) vía
 * `$queryRaw` — el SP nunca escribe en `registro_auditoria`, así que este job es quien genera
 * esa fila a partir de cada resultado, con `accion: "RETENCION_ANONIMIZADO"`/`"RETENCION_ELIMINADO"`.
 * No incluye el valor PII original en `valorDespues` cuando la acción es `ANONIMIZAR`
 * (contradiría el propósito de anonimizar) — solo qué tabla/fila se tocó.
 */
export async function purgarRetencionDeTodasLasEmpresas(
  prisma: PrismaClient,
  registrarEventoAuditoria: RegistradorEventoAuditoria,
): Promise<void> {
  const empresas = await prisma.empresa.findMany({ where: { activa: true }, select: { id: true } });

  for (const { id: empresaId } of empresas) {
    const filas = await prisma.$queryRaw<FilaPurgada[]>`
      SELECT * FROM sp_retencion_purgar_datos(${empresaId})
    `;

    for (const fila of filas) {
      const accion = fila.accion_aplicada === "ANONIMIZADO" ? "RETENCION_ANONIMIZADO" : "RETENCION_ELIMINADO";
      await registrarEventoAuditoria({
        empresaId,
        usuarioId: "sistema",
        accion,
        entidadTipo: fila.tabla,
        entidadId: fila.id,
      });
    }

    if (filas.length > 0) {
      console.log(`[retencion] Empresa ${empresaId}: ${filas.length} fila(s) purgada(s).`);
    }
  }
}

/** Registra el job en el cron del proceso. Cron por defecto: diario a las 3am (configurable vía `RETENCION_JOB_CRON`). */
export function iniciarJobPurgarRetencion(prisma: PrismaClient, registrarEventoAuditoria: RegistradorEventoAuditoria): void {
  const expresionCron = process.env.RETENCION_JOB_CRON ?? "0 3 * * *";
  cron.schedule(expresionCron, () => {
    purgarRetencionDeTodasLasEmpresas(prisma, registrarEventoAuditoria).catch((error) => {
      console.error("[retencion] Job de purgado falló:", error);
    });
  });
  console.log(`[retencion] Job de purgado programado (cron: "${expresionCron}").`);
}
