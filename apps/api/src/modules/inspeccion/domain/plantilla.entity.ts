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

/** 007-gobernanza-permisos-aprobacion — flujo de aprobación de una plantilla. */
export type EstadoAprobacionPlantilla = "BORRADOR" | "EN_REVISION" | "APROBADA" | "RECHAZADA";

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
  estadoAprobacion: EstadoAprobacionPlantilla;
  solicitadoPorId?: string | null;
  solicitadoEn?: Date | null;
  aprobadorId?: string | null;
  resueltoEn?: Date | null;
  comentarioResolucion?: string | null;
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

/**
 * 007-gobernanza-permisos-aprobacion: además de `activa` y vigente, exige que la plantilla
 * haya sido aprobada — evita que un cambio de estructura sin revisar afecte certificaciones
 * futuras sin que nadie más lo haya validado.
 *
 * @param p - Plantilla con su `estadoAprobacion` actual.
 * @returns `true` si puede usarse para iniciar una certificación nueva.
 * @example
 *   puedeIniciarInspeccion({ activa: true, estadoAprobacion: "APROBADA" })  // → true
 *   puedeIniciarInspeccion({ activa: true, estadoAprobacion: "BORRADOR" })  // → false
 */
export function puedeIniciarInspeccion(p: Plantilla): boolean {
  if (!p.activa) return false;
  if (p.fechaVigencia && p.fechaVigencia < new Date()) return false;
  if (p.estadoAprobacion !== "APROBADA") return false;
  return true;
}

/**
 * Solo una plantilla en `BORRADOR` con al menos una pregunta puede enviarse a revisión.
 *
 * @param plantilla - Plantilla con su `estadoAprobacion` actual.
 * @param totalPreguntas - Cantidad de nodos PREGUNTA en el árbol (`contarPreguntas()`).
 * @returns `true` si puede enviarse a revisión.
 * @example
 *   puedeEnviarseARevision({ estadoAprobacion: "BORRADOR" }, 5)  // → true
 *   puedeEnviarseARevision({ estadoAprobacion: "BORRADOR" }, 0)  // → false
 */
export function puedeEnviarseARevision(plantilla: Pick<Plantilla, "estadoAprobacion">, totalPreguntas: number): boolean {
  return plantilla.estadoAprobacion === "BORRADOR" && totalPreguntas > 0;
}

/**
 * Solo una plantilla `EN_REVISION` puede aprobarse.
 *
 * @param plantilla - Plantilla con su `estadoAprobacion` actual.
 * @returns `true` si puede aprobarse.
 * @example
 *   puedeAprobarse({ estadoAprobacion: "EN_REVISION" })  // → true
 */
export function puedeAprobarse(plantilla: Pick<Plantilla, "estadoAprobacion">): boolean {
  return plantilla.estadoAprobacion === "EN_REVISION";
}

/**
 * Solo una plantilla `EN_REVISION` con un comentario no vacío puede rechazarse.
 *
 * @param plantilla - Plantilla con su `estadoAprobacion` actual.
 * @param comentario - Justificación del rechazo, obligatoria.
 * @returns `true` si puede rechazarse.
 * @example
 *   puedeRechazarse({ estadoAprobacion: "EN_REVISION" }, "Faltan preguntas")  // → true
 *   puedeRechazarse({ estadoAprobacion: "EN_REVISION" }, "")                  // → false
 */
export function puedeRechazarse(plantilla: Pick<Plantilla, "estadoAprobacion">, comentario?: string): boolean {
  return plantilla.estadoAprobacion === "EN_REVISION" && !!comentario?.trim();
}

/**
 * Editar una plantilla ya `APROBADA` o `RECHAZADA` la revierte a `BORRADOR` — un cambio
 * siempre debe volver a pasar por revisión.
 *
 * @param estadoActual - `estadoAprobacion` antes del cambio.
 * @returns `true` si el estado debe revertirse a `BORRADOR`.
 * @example
 *   debeRevertirABorrador("APROBADA")   // → true
 *   debeRevertirABorrador("BORRADOR")   // → false
 */
export function debeRevertirABorrador(estadoActual: EstadoAprobacionPlantilla): boolean {
  return estadoActual === "APROBADA" || estadoActual === "RECHAZADA";
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

/**
 * Suma los puntajes máximos de todas las PREGUNTAs del árbol.
 * Los nodos PANEL no aportan puntaje directo.
 *
 * @param nodos - Raíces del árbol de nodos.
 * @returns Suma de `puntajeMaximo` de todos los nodos PREGUNTA.
 * @example
 *   sumarPuntajes([]) // 0
 *   sumarPuntajes([{ tipo: "PREGUNTA", puntajeMaximo: 100, hijos: [] }]) // 100
 */
export function sumarPuntajes(nodos: NodoArbol[]): number {
  return nodos.reduce((acc, n) => {
    if (n.tipo === "PREGUNTA") return acc + n.puntajeMaximo;
    return acc + sumarPuntajes(n.hijos);
  }, 0);
}
