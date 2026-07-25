import { z } from "zod";

export const programarPlanAuditoriaSchema = z.object({
  sucursalId: z.string().uuid(),
  fechaObjetivo: z.coerce.date(),
  responsableSugeridoId: z.string().uuid().optional(),
});

export const reprogramarPlanAuditoriaSchema = z.object({
  fechaObjetivo: z.coerce.date(),
});

export const ejecutarPlanAuditoriaSchema = z.object({
  inspeccionId: z.string().uuid(),
});

export type ProgramarPlanAuditoriaInput = z.infer<typeof programarPlanAuditoriaSchema>;
export type ReprogramarPlanAuditoriaInput = z.infer<typeof reprogramarPlanAuditoriaSchema>;
export type EjecutarPlanAuditoriaInput = z.infer<typeof ejecutarPlanAuditoriaSchema>;
