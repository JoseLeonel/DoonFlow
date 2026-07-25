import { z } from "zod";

export const listarNotificacionesQuerySchema = z.object({
  soloNoLeidas: z.coerce.boolean().optional(),
});

export type ListarNotificacionesQuery = z.infer<typeof listarNotificacionesQuerySchema>;
