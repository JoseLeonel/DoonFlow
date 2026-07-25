import { z } from "zod";

export const crearApelacionSchema = z
  .object({
    inspeccionId: z.string().uuid(),
    tipo: z.enum(["SOBRE_HALLAZGO", "SOBRE_RESULTADO"]),
    hallazgoId: z.string().uuid().optional(),
    motivo: z.string().min(10, "El motivo debe tener al menos 10 caracteres.").max(2000),
  })
  .superRefine((datos, ctx) => {
    if (datos.tipo === "SOBRE_HALLAZGO" && !datos.hallazgoId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["hallazgoId"], message: "Se requiere el hallazgo apelado." });
    }
    if (datos.tipo === "SOBRE_RESULTADO" && datos.hallazgoId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["hallazgoId"], message: "No se indica hallazgo al apelar el resultado general." });
    }
  });

export const resolverApelacionSchema = z.object({
  estado: z.enum(["ACEPTADA", "RECHAZADA"]),
  resolucionComentario: z.string().min(10, "La justificación debe tener al menos 10 caracteres.").max(2000),
});

export type CrearApelacionInput = z.infer<typeof crearApelacionSchema>;
export type ResolverApelacionInput = z.infer<typeof resolverApelacionSchema>;
