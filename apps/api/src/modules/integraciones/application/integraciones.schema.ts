import { z } from "zod";
import { crearClienteSchema } from "../../clientes/application/cliente.schema";

/** Misma forma que `crearClienteSchema` — la plantilla de importación refleja 1 a 1 los campos de Cliente. */
export const filaImportacionClienteSchema = crearClienteSchema;
export type FilaImportacionClienteInput = z.infer<typeof filaImportacionClienteSchema>;

export const filaImportacionSucursalSchema = z.object({
  identificacionCliente: z.string().min(1, "La identificación del cliente es requerida").max(50),
  nombre: z.string().min(1, "El nombre de la sucursal es requerido").max(150),
  direccion: z.string().max(300).nullable().optional().transform((v) => v || null),
  correo: z.string().email("Formato de correo inválido").nullable().optional().transform((v) => v || null),
  movil: z.string().max(20).nullable().optional().transform((v) => v || null),
});
export type FilaImportacionSucursalInput = z.infer<typeof filaImportacionSucursalSchema>;
