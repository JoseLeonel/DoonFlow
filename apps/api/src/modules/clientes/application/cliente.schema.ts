import { z } from "zod";

const correoOpcional = z
  .string()
  .email("Formato de correo inválido")
  .nullable()
  .optional()
  .transform((v) => v || null);

export const crearClienteSchema = z.object({
  nombreResponsable:     z.string().min(1, "El nombre del responsable es requerido").max(200),
  empresa:               z.string().min(1, "El nombre de la empresa es requerido").max(200),
  identificacionEmpresa: z.string().max(50).nullable().optional().transform((v) => v || null),
  correo1:               z.string().email("Formato de correo inválido").max(150),
  correo2:               correoOpcional,
  correo3:               correoOpcional,
  direccion:             z.string().max(300).nullable().optional().transform((v) => v || null),
  movil:                 z.string().max(20).nullable().optional().transform((v) => v || null),
});

export const actualizarClienteSchema = crearClienteSchema.partial();

export type CrearClienteInput    = z.infer<typeof crearClienteSchema>;
export type ActualizarClienteInput = z.infer<typeof actualizarClienteSchema>;
