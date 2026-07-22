import type { NodoArbol } from "@doonflow/shared";

/** Ids de todos los nodos PREGUNTA (hojas) del árbol, recursivo. */
export function idsPreguntasDelArbol(nodo: NodoArbol): string[] {
  if (nodo.tipo === "PREGUNTA") return [nodo.id];
  return nodo.hijos.flatMap(idsPreguntasDelArbol);
}
