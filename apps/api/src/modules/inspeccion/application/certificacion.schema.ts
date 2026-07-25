import { z } from "zod";

export const iniciarCertificacionSchema = z
  .object({
    plantillaId: z.string().uuid(),
    sucursalId: z.string().uuid(),
    fechaInicioPeriodo: z.coerce.date(),
    fechaFinPeriodo: z.coerce.date(),
    /** 014-panel-calendario-biblioteca — si la certificación viene de un plan de auditoría programado. */
    planId: z.string().uuid().optional(),
  })
  .refine((datos) => datos.fechaFinPeriodo > datos.fechaInicioPeriodo, {
    message: "La fecha final del período debe ser posterior a la fecha inicial.",
    path: ["fechaFinPeriodo"],
  });

/** Siempre visibles en el wizard (ambas respuestas Sí/No) — 1500 caracteres, con contador en la UI. */
const camposComentariosCategorizados = {
  comentarioReconocimiento: z.string().max(1500).nullable().optional(),
  comentarioObservacion: z.string().max(1500).nullable().optional(),
  comentarioOportunidadMejora: z.string().max(1500).nullable().optional(),
};

export const guardarRespuestasSeccionSchema = z.object({
  respuestas: z.array(
    z.object({
      nodoId: z.string().uuid(),
      valor: z.string().max(2000).nullable().optional(),
      valores: z.array(z.string()).optional(),
      ...camposComentariosCategorizados,
    }),
  ),
});

export type IniciarCertificacionInput = z.infer<typeof iniciarCertificacionSchema>;
export type GuardarRespuestasSeccionInput = z.infer<typeof guardarRespuestasSeccionSchema>;

// ── Captura offline (012-captura-offline-campo) ────────────────────────────

export const sincronizarLoteSchema = z.object({
  capturaOffline: z.boolean().optional().default(false),
  respuestas: z.array(
    z.object({
      nodoId: z.string().uuid(),
      valor: z.string().max(2000).nullable().optional(),
      valores: z.array(z.string()).optional(),
      ...camposComentariosCategorizados,
      capturadoEnCliente: z.coerce.date(),
    }),
  ),
});

export type SincronizarLoteInput = z.infer<typeof sincronizarLoteSchema>;

// ── Firma de certificación (005-certificacion-plan-cumplimiento, retomado) ─

export const firmarCertificacionSchema = z.object({
  comentarioFirma: z.string().max(2000).nullable().optional(),
  /** Enviado por el cliente desde su cola local de sincronización (IndexedDB) — el servidor
   * no puede contar pendientes de forma confiable, ver `SincronizarCapturaOfflineUseCase.obtenerEstado`. */
  pendientesSincronizacion: z.number().int().min(0).optional().default(0),
});

export type FirmarCertificacionInput = z.infer<typeof firmarCertificacionSchema>;

// ── Finalización liviana ("Guardar y finalizar", 2026-07-24) ──────────────

export const finalizarCertificacionSchema = z.object({
  pendientesSincronizacion: z.number().int().min(0).optional().default(0),
});

export type FinalizarCertificacionInput = z.infer<typeof finalizarCertificacionSchema>;
