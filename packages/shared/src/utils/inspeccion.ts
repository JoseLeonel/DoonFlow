import type { NodoArbol, RangoResultado } from "../types/inspeccion";

/**
 * Cuenta solo los nodos PREGUNTA de todo el árbol (hojas).
 *
 * @param nodos - Raíces del árbol de nodos.
 * @returns Cantidad de nodos PREGUNTA en el árbol.
 * @example
 *   contarPreguntas([]) // 0
 */
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
 *   sumarPuntajes([{ tipo: "PREGUNTA", puntajeMaximo: 30, hijos: [] }, { tipo: "PREGUNTA", puntajeMaximo: 70, hijos: [] }]) // 100
 */
export function sumarPuntajes(nodos: NodoArbol[]): number {
  return nodos.reduce((acc, n) => {
    if (n.tipo === "PREGUNTA") return acc + n.puntajeMaximo;
    return acc + sumarPuntajes(n.hijos);
  }, 0);
}

/**
 * Verifica que los rangos de resultado no se solapen.
 *
 * @param rangos - Lista de rangos a validar.
 * @returns `null` si son válidos, o un mensaje de error describiendo el primer solapamiento.
 * @example
 *   validarRangos([]) // null
 *   validarRangos([{ desde: 0, hasta: 50 }, { desde: 40, hasta: 100 }]) // "Rangos ... se solapan."
 */
export function validarRangos(rangos: RangoResultado[]): string | null {
  const ord = [...rangos].sort((a, b) => a.desde - b.desde);
  for (let i = 0; i < ord.length - 1; i++) {
    if (ord[i]!.hasta >= ord[i + 1]!.desde)
      return `Rangos "${ord[i]!.clasificacion}" y "${ord[i + 1]!.clasificacion}" se solapan.`;
  }
  return null;
}
