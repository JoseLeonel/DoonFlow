import { z } from "zod";

export const iniciarSesionSchema = z.object({
  email: z.string().email("Email inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export type IniciarSesionInput = z.infer<typeof iniciarSesionSchema>;

export const actualizarAsignacionSucursalesSchema = z.object({
  sucursalPrincipalId: z.string().uuid().nullable(),
  sucursalesAdicionalesIds: z.array(z.string().uuid()),
});

export type ActualizarAsignacionSucursalesInput = z.infer<typeof actualizarAsignacionSucursalesSchema>;
