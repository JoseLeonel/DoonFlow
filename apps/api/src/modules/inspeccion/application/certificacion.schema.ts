import { z } from "zod";

export const iniciarCertificacionSchema = z.object({
  plantillaId: z.string().uuid(),
  sucursalId: z.string().uuid(),
  periodoEtiqueta: z.string().min(1, "El período es requerido").max(50),
});

export const guardarRespuestasSeccionSchema = z.object({
  respuestas: z.array(
    z.object({
      nodoId: z.string().uuid(),
      valor: z.string().max(2000).nullable().optional(),
      valores: z.array(z.string()).optional(),
      comentario: z.string().max(2000).nullable().optional(),
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
      comentario: z.string().max(2000).nullable().optional(),
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
