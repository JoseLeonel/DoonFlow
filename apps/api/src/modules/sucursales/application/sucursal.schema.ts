import { z } from "zod";

export const crearSucursalSchema = z.object({
  nombre:     z.string().min(1, "El nombre es requerido").max(150),
  clienteId:  z.string().uuid("clienteId inválido"),
  direccion:  z.string().max(300).nullable().optional().transform((v) => v || null),
  correo:     z.string().email("Formato de correo inválido").nullable().optional().transform((v) => v || null),
  movil:      z.string().max(20).nullable().optional().transform((v) => v || null),
});

export const actualizarSucursalSchema = crearSucursalSchema.omit({ clienteId: true }).partial();

export type CrearSucursalInput      = z.infer<typeof crearSucursalSchema>;
export type ActualizarSucursalInput = z.infer<typeof actualizarSucursalSchema>;
