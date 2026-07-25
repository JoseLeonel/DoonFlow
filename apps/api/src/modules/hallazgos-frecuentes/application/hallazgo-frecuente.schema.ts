import { z } from "zod";

export const crearHallazgoFrecuenteSchema = z.object({
  descripcionHallazgo: z.string().min(3).max(300),
  severidadSugerida: z.enum(["CRITICA", "MAYOR", "MENOR"]),
  descripcionAccionSugerida: z.string().max(2000).nullable().optional(),
});

export const actualizarHallazgoFrecuenteSchema = crearHallazgoFrecuenteSchema.partial();

export type CrearHallazgoFrecuenteInput = z.infer<typeof crearHallazgoFrecuenteSchema>;
export type ActualizarHallazgoFrecuenteInput = z.infer<typeof actualizarHallazgoFrecuenteSchema>;
