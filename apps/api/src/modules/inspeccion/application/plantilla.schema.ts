import { z } from "zod";

export const crearPlantillaSchema = z.object({
  nombre: z.string().min(3).max(200),
  descripcion: z.string().max(500).optional(),
  tipo: z.enum(["MINISTERIO_SALUD","AUDITORIA_INTERNA","CALIDAD","SEGURIDAD_OCUPACIONAL","SUPERVISION_OPERATIVA","OTRO"]),
  puntajeMaximo: z.number().positive().default(100),
  fechaVigencia: z.string().datetime().optional(),
  observaciones: z.string().max(1000).optional(),
});

export const actualizarPlantillaSchema = crearPlantillaSchema.partial();

// ── Nodo genérico ────────────────────────────────────────────────────────────

export const crearNodoSchema = z.object({
  padreId:   z.string().uuid().optional(),
  tipo:      z.enum(["PANEL", "PREGUNTA"]),
  codigo:    z.string().min(1).max(30),
  titulo:    z.string().min(1).max(500),
  criterio:  z.string().max(1000).optional(),
  orden:     z.number().int().min(0).default(0),
  // Solo para PREGUNTA:
  tipoRespuesta:    z.enum(["SI_NO","SELECCION_UNICA","SELECCION_MULTIPLE","TEXTO_LIBRE","NUMERICO","PUNTAJE_MANUAL"]).optional(),
  modalidadPuntaje: z.enum(["FIJO","PARCIAL","MANUAL","POR_OPCIONES"]).optional(),
  puntajeMaximo:    z.number().min(0).default(0),
  evidenciaObligatoria: z.boolean().default(false),
  evidenciaMinima: z.number().int().min(0).default(0),
  evidenciaMaxima: z.number().int().min(0).default(5),
});

export const actualizarNodoSchema = crearNodoSchema.partial().omit({ padreId: true });

export const reordenarSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), orden: z.number().int().min(0) })),
});

export type CrearPlantillaInput   = z.infer<typeof crearPlantillaSchema>;
export type ActualizarPlantillaInput = z.infer<typeof actualizarPlantillaSchema>;
export type CrearNodoInput        = z.infer<typeof crearNodoSchema>;
export type ActualizarNodoInput   = z.infer<typeof actualizarNodoSchema>;
