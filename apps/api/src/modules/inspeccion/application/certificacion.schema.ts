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
