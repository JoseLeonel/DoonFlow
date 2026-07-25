import type { PlanAuditoria } from "./plan-auditoria.entity";

/** Alcance de visibilidad del usuario autenticado, definido localmente (mismo patrón que `sucursales`/`clientes`). */
export type AlcanceConsulta =
  | { tipo: "TOTAL" }
  | { tipo: "CLIENTE"; clienteId: string }
  | { tipo: "SUCURSAL"; sucursalIds: string[] };

/** DTO de lectura enriquecido — mismo criterio que `AccionCorrectivaConEvidencias.responsableNombre`. */
export interface PlanAuditoriaConDetalle extends PlanAuditoria {
  sucursalNombre: string;
  clienteNombre: string;
  responsableSugeridoNombre: string | null;
}

export interface DatosCrearPlanAuditoria {
  empresaId: string;
  sucursalId: string;
  fechaObjetivo: Date;
  responsableSugeridoId?: string | null;
}

export interface FiltrosPlanAuditoria {
  sucursalId?: string;
  /** Formato `YYYY-MM` — filtra por mes de `fechaObjetivo`. */
  mes?: string;
}

export interface PlanAuditoriaRepositoryPort {
  /** Lista los planes de la empresa dentro del alcance del usuario, opcionalmente filtrados por sucursal o mes. */
  listar(empresaId: string, filtros: FiltrosPlanAuditoria, alcance?: AlcanceConsulta): Promise<PlanAuditoriaConDetalle[]>;
  /** Obtiene un plan por id, o `null` si no existe o pertenece a otra empresa. */
  obtenerPorId(id: string, empresaId: string): Promise<PlanAuditoriaConDetalle | null>;
  /** Crea un plan nuevo en estado `PROGRAMADA`. */
  crear(datos: DatosCrearPlanAuditoria): Promise<PlanAuditoriaConDetalle>;
  /** Cambia `fechaObjetivo` y pone `estado: "REPROGRAMADA"`. */
  reprogramar(id: string, empresaId: string, nuevaFecha: Date): Promise<PlanAuditoriaConDetalle>;
  /** Vincula el plan a la certificación que lo originó y lo marca `EJECUTADA`. */
  marcarEjecutada(id: string, empresaId: string, inspeccionId: string): Promise<PlanAuditoriaConDetalle>;
}
