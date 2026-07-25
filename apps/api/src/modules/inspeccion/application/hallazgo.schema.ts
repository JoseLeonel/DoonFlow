import { z } from "zod";

/** Solo NO_CONFORMIDAD exige `severidad` — las otras 3 son informativas (2026-07-25). */
export const crearHallazgoSchema = z
  .object({
    descripcion: z.string().min(1, "La descripción es requerida").max(1500),
    categoria: z.enum(["NO_CONFORMIDAD", "RECONOCIMIENTO", "OBSERVACION", "OPORTUNIDAD_MEJORA"]).default("NO_CONFORMIDAD"),
    severidad: z.enum(["CRITICA", "MAYOR", "MENOR"]).optional(),
    detalleId: z.string().uuid().nullable().optional(),
  })
  .refine((datos) => datos.categoria !== "NO_CONFORMIDAD" || !!datos.severidad, {
    message: "La severidad es requerida para hallazgos de no conformidad.",
    path: ["severidad"],
  });

export const actualizarHallazgoSchema = z.object({
  descripcion: z.string().min(1).max(1500).optional(),
  severidad: z.enum(["CRITICA", "MAYOR", "MENOR"]).optional(),
});

export type CrearHallazgoInput = z.infer<typeof crearHallazgoSchema>;
export type ActualizarHallazgoInput = z.infer<typeof actualizarHallazgoSchema>;
