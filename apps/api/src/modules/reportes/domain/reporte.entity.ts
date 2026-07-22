export type TipoReporte = "CONSOLIDADO_CLIENTE" | "COMPARATIVO_SUCURSALES";
export type FormatoReporte = "EXCEL" | "PDF";

export interface FiltrosReporte {
  clienteId: string;
  sucursalIds?: string[];
  fechaDesde: string;
  fechaHasta: string;
}

export interface ReporteGenerado {
  id: string;
  empresaId: string;
  tipo: TipoReporte;
  filtros: FiltrosReporte;
  formato: FormatoReporte;
  url: string;
  generadoPorId: string;
  creadoEn: Date;
}

/** Fila del historial — igual que `ReporteGenerado` más los textos ya resueltos para la tabla. */
export interface ReporteHistorialItem extends ReporteGenerado {
  resumenFiltros: string;
  generadoPorNombre: string;
}

/**
 * Alcance del usuario autenticado — mismo tipo `{ tipo: "TOTAL" | "CLIENTE" | "SUCURSAL" }` ya
 * usado por `alcance.middleware.ts` y los módulos `clientes`/`sucursales` (calculado a partir del
 * rol, no se repite la lógica de rol aquí). Definido localmente por dependencia hexagonal: cada
 * módulo declara sus propios tipos de entrada en vez de importar `req.alcance` de infraestructura.
 */
export type AlcanceUsuarioReporte =
  | { tipo: "TOTAL" }
  | { tipo: "CLIENTE"; clienteId: string }
  | { tipo: "SUCURSAL"; sucursalIds: string[] };

/**
 * Texto legible para la columna "Filtros" del historial de reportes — nunca se muestra el JSON crudo.
 *
 * @param filtros - Filtros usados para generar el reporte (snapshot).
 * @param clienteNombre - Nombre comercial del cliente (ya resuelto, el dominio no consulta la BD).
 * @returns Resumen legible, distinto para consolidado (un cliente) y comparativo (N sucursales).
 * @example
 *   construirResumenFiltros({ clienteId: "c1", fechaDesde: "2026-06-01", fechaHasta: "2026-06-30" }, "Distribuidora Sur S.A.")
 *   // → "Distribuidora Sur S.A. · 01/06/2026 – 30/06/2026"
 */
export function construirResumenFiltros(filtros: FiltrosReporte, clienteNombre: string): string {
  const rango = `${formatearFecha(filtros.fechaDesde)} – ${formatearFecha(filtros.fechaHasta)}`;
  if (filtros.sucursalIds && filtros.sucursalIds.length > 0) {
    return `${clienteNombre} (${filtros.sucursalIds.length} suc.) · ${rango}`;
  }
  return `${clienteNombre} · ${rango}`;
}

function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

/**
 * Regla de negocio 1 del spec: quién puede generar/consultar reportes de qué cliente.
 *
 * @param alcance - Alcance del usuario autenticado (`TOTAL`=administrador, `CLIENTE`=administrador_cliente, `SUCURSAL`=usuario_sucursal).
 * @param clienteIdSolicitado - Cliente sobre el que se quiere generar/consultar el reporte.
 * @returns `true` si el usuario puede operar sobre ese cliente.
 * @example
 *   puedeGenerarReporte({ tipo: "CLIENTE", clienteId: "A" }, "A")  // → true
 *   puedeGenerarReporte({ tipo: "CLIENTE", clienteId: "A" }, "B")  // → false
 *   puedeGenerarReporte({ tipo: "SUCURSAL", sucursalIds: [] }, "A")  // → false
 */
export function puedeGenerarReporte(alcance: AlcanceUsuarioReporte, clienteIdSolicitado: string): boolean {
  if (alcance.tipo === "TOTAL") return true;
  if (alcance.tipo === "CLIENTE") return alcance.clienteId === clienteIdSolicitado;
  return false;
}

// ── Datos agregados de los reportes ──────────────────────────────────────────
//
// Alcance reducido respecto al spec original (ver memoria/decisiones.md, 2026-07-21):
// sin hallazgosAbiertos/estadoPlanCumplimiento (dependen de 013, bloqueado) ni
// certificacionVigente/certificacionVencida (dependen de fechaVencimiento de 005, pausado).
// Los datos vienen de Inspeccion tal como existe hoy (015) — puntajeObtenido/
// porcentajeCumplimiento/clasificacion, sin distinguir "completa" de "en progreso"
// porque Inspeccion.estado nunca sale de "EN_PROGRESO" en el código actual.

export interface FilaConsolidadoSucursal {
  sucursalId: string;
  sucursalNombre: string;
  certificacionesDelPeriodo: number;
  puntajeVigente: number | null;
  puntajeMaximoVigente: number | null;
  clasificacionVigente: string | null;
}

export interface DatosConsolidadoCliente {
  clienteId: string;
  clienteNombre: string;
  periodo: { fechaDesde: string; fechaHasta: string };
  sucursales: FilaConsolidadoSucursal[];
}

export interface FilaComparativaSucursal {
  sucursalId: string;
  sucursalNombre: string;
  puntaje: number | null;
  puntajeMaximo: number | null;
  porcentajeCumplimiento: number | null;
  clasificacion: string | null;
  tieneCertificacionEnPeriodo: boolean;
}

export interface DatosComparativoSucursales {
  clienteId: string;
  clienteNombre: string;
  periodo: { fechaDesde: string; fechaHasta: string };
  filas: FilaComparativaSucursal[];
}
