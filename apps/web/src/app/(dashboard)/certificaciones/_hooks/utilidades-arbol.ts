import type { NodoArbol } from "@doonflow/shared";

/** Ids de todos los nodos PREGUNTA (hojas) del árbol, recursivo. */
export function idsPreguntasDelArbol(nodo: NodoArbol): string[] {
  if (nodo.tipo === "PREGUNTA") return [nodo.id];
  return nodo.hijos.flatMap(idsPreguntasDelArbol);
}

/** Todos los nodos PREGUNTA (hojas) del árbol, recursivo — para resolver puntajeMaximo/tipoRespuesta por id. */
export function preguntasDelArbol(nodo: NodoArbol): NodoArbol[] {
  if (nodo.tipo === "PREGUNTA") return [nodo];
  return nodo.hijos.flatMap(preguntasDelArbol);
}

/**
 * Mismo cálculo que `calcularPuntajeRespuesta()` del dominio backend
 * (`apps/api/.../domain/certificacion.entity.ts`) — se duplica en el frontend siguiendo el
 * mismo patrón ya establecido para `contarPreguntas`/`sumarPuntajes` (una copia por capa, sin
 * acoplar el dominio del backend a un paquete de presentación). Se usa solo para mostrar un
 * puntaje en vivo mientras se responde — el servidor siempre recalcula y es la fuente de verdad.
 */
export function calcularPuntajeRespuestaLocal(
  nodo: Pick<NodoArbol, "tipoRespuesta" | "modalidadPuntaje" | "puntajeMaximo" | "opciones">,
  valor?: string,
  valores?: string[],
): number {
  if (nodo.tipoRespuesta === "SI_NO") {
    return valor === "SI" ? nodo.puntajeMaximo : 0;
  }
  if (nodo.modalidadPuntaje === "POR_OPCIONES" && nodo.opciones.length > 0) {
    const idsSeleccionados = valores ?? (valor ? [valor] : []);
    const puntaje = nodo.opciones
      .filter((o) => idsSeleccionados.includes(o.id))
      .reduce((acc, o) => acc + o.puntaje, 0);
    return Math.min(puntaje, nodo.puntajeMaximo);
  }
  if (nodo.modalidadPuntaje === "MANUAL" || nodo.tipoRespuesta === "PUNTAJE_MANUAL") {
    const num = Number(valor);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.min(num, nodo.puntajeMaximo);
  }
  return 0;
}
