import { z } from "zod";

export const crearHallazgoSchema = z.object({
  descripcion: z.string().min(1, "La descripción es requerida").max(500),
  severidad: z.enum(["CRITICA", "MAYOR", "MENOR"]),
  detalleId: z.string().uuid().nullable().optional(),
});

export const actualizarHallazgoSchema = crearHallazgoSchema.partial();

export type CrearHallazgoInput = z.infer<typeof crearHallazgoSchema>;
export type ActualizarHallazgoInput = z.infer<typeof actualizarHallazgoSchema>;
