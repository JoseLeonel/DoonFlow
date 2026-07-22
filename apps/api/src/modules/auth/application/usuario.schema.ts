import { z } from "zod";

export const crearUsuarioSchema = z.object({
  nombre:   z.string().min(1, "El nombre es requerido").max(200),
  email:    z.string().email("Formato de correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional(),
  rolId:    z.string().uuid("rolId inválido"),
  clienteId:  z.string().uuid().nullable().optional(),
  sucursalId: z.string().uuid().nullable().optional(),
  sucursalesAdicionalesIds: z.array(z.string().uuid()).optional(),
});

export const actualizarUsuarioSchema = crearUsuarioSchema.partial();

export type CrearUsuarioInput      = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
