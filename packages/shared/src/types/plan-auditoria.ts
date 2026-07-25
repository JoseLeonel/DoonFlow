export type EstadoPlanAuditoria = "PROGRAMADA" | "EJECUTADA" | "REPROGRAMADA";

export interface PlanAuditoria {
  id: string;
  sucursalId: string;
  fechaObjetivo: string;
  responsableSugeridoId: string | null;
  estado: EstadoPlanAuditoria;
  inspeccionId: string | null;
  creadoEn: string;
  empresaId: string;
  sucursalNombre: string;
  clienteNombre: string;
  responsableSugeridoNombre: string | null;
}
