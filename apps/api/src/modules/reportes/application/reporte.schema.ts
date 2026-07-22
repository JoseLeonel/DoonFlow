import { z } from "zod";

export const generarReporteSchema = z
  .object({
    tipo: z.enum(["CONSOLIDADO_CLIENTE", "COMPARATIVO_SUCURSALES"]),
    formato: z.enum(["EXCEL", "PDF"]),
    clienteId: z.string().uuid("clienteId inválido"),
    sucursalIds: z.array(z.string().uuid()).optional(),
    fechaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
    fechaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  })
  .refine((datos) => datos.fechaHasta >= datos.fechaDesde, {
    message: "fechaHasta debe ser mayor o igual a fechaDesde",
    path: ["fechaHasta"],
  })
  .refine((datos) => datos.tipo !== "COMPARATIVO_SUCURSALES" || (datos.sucursalIds && datos.sucursalIds.length > 0), {
    message: "sucursalIds es requerido para el reporte comparativo",
    path: ["sucursalIds"],
  });

export type GenerarReporteInput = z.infer<typeof generarReporteSchema>;

export const listarHistorialSchema = z.object({
  tipo: z.enum(["CONSOLIDADO_CLIENTE", "COMPARATIVO_SUCURSALES"]).optional(),
  clienteId: z.string().uuid().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().default(20),
});

export type ListarHistorialInput = z.infer<typeof listarHistorialSchema>;
