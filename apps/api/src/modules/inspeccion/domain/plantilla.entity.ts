/**
 * Entidad de dominio — Módulo de Inspecciones.
 * Arquitectura genérica de n-niveles: PANEL (sección) | PREGUNTA (hoja).
 * Sin dependencias de Express ni Prisma.
 */

export type TipoInspeccion =
  | "MINISTERIO_SALUD" | "AUDITORIA_INTERNA" | "CALIDAD"
  | "SEGURIDAD_OCUPACIONAL" | "SUPERVISION_OPERATIVA" | "OTRO";

export type TipoNodo = "PANEL" | "PREGUNTA";
export type TipoRespuesta =
  | "SI_NO" | "SELECCION_UNICA" | "SELECCION_MULTIPLE"
  | "TEXTO_LIBRE" | "NUMERICO" | "PUNTAJE_MANUAL";
export type ModalidadPuntaje = "FIJO" | "PARCIAL" | "MANUAL" | "POR_OPCIONES";
export type ReglaComentario =
  | "NUNCA" | "SIEMPRE" | "CUANDO_NEGATIVO"
  | "CUANDO_PUNTAJE_MENOR_MAXIMO" | "CONFIGURABLE";

export interface Plantilla {
  id: string;
  empresaId: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoInspeccion;
  activa: boolean;
  puntajeMaximo: number;
  fechaVigencia?: Date;
  observaciones?: string;
  version: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface RangoResultado {
  id: string; desde: number; hasta: number;
  clasificacion: string; color: string; orden: number;
}

/**
 * Nodo del árbol: puede ser PANEL (sección con hijos) o PREGUNTA (hoja respondible).
 * Los hijos se renderizan recursivamente — soporta cualquier profundidad.
 */
export interface NodoArbol {
  id: string;
  padreId: string | null;
  tipo: TipoNodo;
  codigo: string;
  titulo: string;
  criterio?: string;
  orden: number;
  nivel: number;
  activo: boolean;
  // Solo para PREGUNTA:
  tipoRespuesta?: TipoRespuesta;
  modalidadPuntaje?: ModalidadPuntaje;
  puntajeMaximo: number;
  reglaComentario: ReglaComentario;
  evidenciaObligatoria: boolean;
  evidenciaMinima: number;
  evidenciaMaxima: number;
  opciones: NodoOpcion[];
  // Hijos (PANEL contiene más nodos; PREGUNTA tiene lista vacía)
  hijos: NodoArbol[];
}

export interface NodoOpcion {
  id: string; etiqueta: string; criterio?: string;
  puntaje: number; orden: number;
}

export interface PlantillaCompleta extends Plantilla {
  /** Nodos raíz (nivel 0); cada uno lleva su árbol de hijos recursivo. */
  nodos: NodoArbol[];
  rangosResultado: RangoResultado[];
}

// ── Reglas de negocio puras ─────────────────────────────────────────────────

export function puedeIniciarInspeccion(p: Plantilla): boolean {
  if (!p.activa) return false;
  if (p.fechaVigencia && p.fechaVigencia < new Date()) return false;
  return true;
}

export function validarRangos(rangos: RangoResultado[]): string | null {
  const ord = [...rangos].sort((a, b) => a.desde - b.desde);
  for (let i = 0; i < ord.length - 1; i++) {
    if (ord[i]!.hasta >= ord[i + 1]!.desde)
      return `Rangos "${ord[i]!.clasificacion}" y "${ord[i + 1]!.clasificacion}" se solapan.`;
  }
  return null;
}

/** Cuenta solo los nodos PREGUNTA de todo el árbol (hojas). */
export function contarPreguntas(nodos: NodoArbol[]): number {
  return nodos.reduce((acc, n) => {
    if (n.tipo === "PREGUNTA") return acc + 1;
    return acc + contarPreguntas(n.hijos);
  }, 0);
}
