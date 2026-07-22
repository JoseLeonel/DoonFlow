import { z } from "zod";

export const crearAccionSchema = z.object({
  hallazgoId: z.string().uuid(),
  descripcion: z.string().min(1, "La descripción es requerida").max(500),
  responsableId: z.string().uuid(),
  fechaLimite: z.coerce.date(),
});

export type CrearAccionInput = z.infer<typeof crearAccionSchema>;
