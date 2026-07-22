import { z } from "zod";

export const actualizarAccionSchema = z.object({
  descripcion: z.string().min(1).max(500).optional(),
  responsableId: z.string().uuid().optional(),
  fechaLimite: z.coerce.date().optional(),
});

export const actualizarAvanceSchema = z.object({
  porcentajeAvance: z.number().int().min(0).max(100),
});

export const verificarAccionSchema = z
  .object({
    resultado: z.enum(["CUMPLIDO", "NO_CUMPLIDO"]),
    comentario: z.string().min(1, "El comentario de verificación es requerido").max(2000),
    nuevaFechaLimite: z.coerce.date().optional(),
  })
  .refine((v) => v.resultado !== "NO_CUMPLIDO" || v.nuevaFechaLimite !== undefined, {
    message: "nuevaFechaLimite es requerida cuando el resultado es NO_CUMPLIDO",
    path: ["nuevaFechaLimite"],
  });

export type ActualizarAccionInput = z.infer<typeof actualizarAccionSchema>;
export type ActualizarAvanceInput = z.infer<typeof actualizarAvanceSchema>;
export type VerificarAccionInput = z.infer<typeof verificarAccionSchema>;
