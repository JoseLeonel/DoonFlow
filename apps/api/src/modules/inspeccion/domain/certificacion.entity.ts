import { contarPreguntas } from "./plantilla.entity";
import type { NodoArbol, RangoResultado } from "./plantilla.entity";

/**
 * Certificación (ampliación de `Inspeccion`) — solo los campos de este sprint.
 * Sin campos de firma (`firmadoPorId`, `codigoVerificacion`, `pdfUrl`, etc.) —
 * esos pertenecen a [[005-certificacion-plan-cumplimiento]], pausado.
 */
export interface Certificacion {
  id: string;
  empresaId: string;
  plantillaId: string;
  plantillaVersion: number;
  inspectorId: string;
  sucursalId: string | null;
  periodoEtiqueta: string | null;
  estado: "EN_PROGRESO";
  fechaInicio: Date;
  fechaFin: Date | null;
  puntajeObtenido: number;
  puntajeMaximo: number;
  porcentajeCumplimiento: number;
  clasificacion: string | null;
  observaciones: string | null;
  /** 012-captura-offline-campo — `true` desde la primera vez que se sincroniza un lote marcado como offline. */
  capturaOffline: boolean;
  /** 012-captura-offline-campo — última vez que un lote de sincronización se procesó sin dejar pendientes. */
  sincronizadoEn: Date | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Indica si la certificación puede firmarse — requiere estar en línea con todo
 * sincronizado (regla de negocio 1 de [[012-captura-offline-campo]]). La firma en sí
 * (`estado → FIRMADA`) la agrega [[005-certificacion-plan-cumplimiento]], pausado — esta
 * función existe ya para que 005 la reutilice sin cambiarla al implementarse.
 *
 * @param certificacion - Certificación con su `estado` actual (se usa la misma forma
 *   mínima que `puedeEditarRespuestas`, para no acoplarse a campos de 005 inexistentes).
 * @param pendientesSincronizacion - Cantidad de respuestas/evidencias sin sincronizar.
 * @returns `false` si hay algo pendiente de sincronizar; `true` en caso contrario.
 * @example
 *   puedeFirmarse({ estado: "EN_PROGRESO" }, 0)  // → true
 *   puedeFirmarse({ estado: "EN_PROGRESO" }, 3)  // → false
 */
export function puedeFirmarse(certificacion: { estado: string }, pendientesSincronizacion: number): boolean {
  return pendientesSincronizacion === 0;
}

/**
 * Indica si la certificación admite editar sus respuestas.
 * En este sprint es siempre `true` porque `EN_PROGRESO` es el único estado posible
 * — se define con esta firma para que [[005-certificacion-plan-cumplimiento]] la
 * reutilice sin cambiarla cuando agregue el estado `FIRMADA` (que la bloquearía).
 *
 * @param certificacion - Certificación con su `estado` actual.
 * @returns `true` si `estado === "EN_PROGRESO"`.
 * @example
 *   puedeEditarRespuestas({ estado: "EN_PROGRESO" })  // → true
 */
export function puedeEditarRespuestas(certificacion: { estado: string }): boolean {
  return certificacion.estado === "EN_PROGRESO";
}

export interface DetalleParaResumen {
  nodoId: string;
  puntajeObtenido: number;
}

export interface ResumenCertificacion {
  puntajeObtenido: number;
  puntajeMaximo: number;
  porcentajeCumplimiento: number;
  clasificacion: string | undefined;
}

/**
 * Calcula el puntaje, porcentaje y clasificación de una certificación en el momento de la
 * lectura — sin stored procedure, no hay transacción de firma que lo dispare en este sprint.
 *
 * @param detalles - Respuestas guardadas de la certificación.
 * @param puntajeMaximoPlantilla - Puntaje máximo configurado en la plantilla vigente.
 * @param rangos - Rangos de clasificación de la plantilla (vacío si no hay ninguno configurado).
 * @returns Resumen con puntajeObtenido, puntajeMaximo, porcentajeCumplimiento y clasificacion.
 * @example
 *   calcularResumen([], 100, [])  // → { puntajeObtenido: 0, puntajeMaximo: 100, porcentajeCumplimiento: 0, clasificacion: undefined }
 */
export function calcularResumen(
  detalles: DetalleParaResumen[],
  puntajeMaximoPlantilla: number,
  rangos: RangoResultado[] = [],
): ResumenCertificacion {
  const puntajeObtenido = detalles.reduce((acc, d) => acc + d.puntajeObtenido, 0);
  const porcentajeCumplimiento =
    puntajeMaximoPlantilla > 0
      ? Math.round((puntajeObtenido / puntajeMaximoPlantilla) * 10000) / 100
      : 0;
  const clasificacion = rangos.find(
    (r) => porcentajeCumplimiento >= r.desde && porcentajeCumplimiento <= r.hasta,
  )?.clasificacion;

  return { puntajeObtenido, puntajeMaximo: puntajeMaximoPlantilla, porcentajeCumplimiento, clasificacion };
}

export interface ResumenSeccion {
  seccionId: string;
  titulo: string;
  respondidas: number;
  total: number;
}

/**
 * Desglosa cuántas preguntas de cada sección de nivel 0 ya tienen respuesta guardada.
 * Usado por el paso de revisión (¿qué secciones quedaron sin responder?) y por el
 * wizard para recalcular `pasosVisitados` al recargar la página a mitad de camino.
 *
 * @param secciones - Nodos de nivel 0 de la plantilla vigente (mismo orden que el editor).
 * @param detalles - Respuestas guardadas de la certificación (solo se usa `nodoId`).
 * @returns Un resumen por cada sección, en el mismo orden recibido.
 * @example
 *   calcularResumenPorSeccion([], [])  // → []
 */
export function calcularResumenPorSeccion(
  secciones: NodoArbol[],
  detalles: { nodoId: string }[],
): ResumenSeccion[] {
  const idsRespondidos = new Set(detalles.map((d) => d.nodoId));
  return secciones.map((seccion) => {
    const idsPreguntas = idsPreguntasDelArbol(seccion);
    const respondidas = idsPreguntas.filter((id) => idsRespondidos.has(id)).length;
    return {
      seccionId: seccion.id,
      titulo: seccion.titulo,
      respondidas,
      total: contarPreguntas([seccion]),
    };
  });
}

function idsPreguntasDelArbol(nodo: NodoArbol): string[] {
  if (nodo.tipo === "PREGUNTA") return [nodo.id];
  return nodo.hijos.flatMap(idsPreguntasDelArbol);
}

export interface NodoConRuta {
  nodo: NodoArbol;
  rutaCodigos: string;
  rutaTitulos: string;
}

/**
 * Indexa todos los nodos del árbol por id, con la ruta jerárquica de códigos/títulos
 * acumulada desde la raíz — usado para construir el snapshot de `InspeccionDetalle`
 * (RF-14: las respuestas conservan la estructura vigente al momento de guardarse).
 *
 * @param nodos - Nodos raíz (nivel 0) de la plantilla vigente.
 * @returns Mapa `nodoId → { nodo, rutaCodigos, rutaTitulos }` para todo el árbol.
 * @example
 *   indexarNodosConRuta([]).size  // → 0
 */
export function indexarNodosConRuta(nodos: NodoArbol[]): Map<string, NodoConRuta> {
  const mapa = new Map<string, NodoConRuta>();
  const recorrer = (lista: NodoArbol[], codigos: string[], titulos: string[]) => {
    for (const nodo of lista) {
      const codigosActuales = [...codigos, nodo.codigo];
      const titulosActuales = [...titulos, nodo.titulo];
      mapa.set(nodo.id, {
        nodo,
        rutaCodigos: codigosActuales.join("|"),
        rutaTitulos: titulosActuales.join("|"),
      });
      recorrer(nodo.hijos, codigosActuales, titulosActuales);
    }
  };
  recorrer(nodos, [], []);
  return mapa;
}

/**
 * Calcula el puntaje obtenido de una respuesta según la modalidad de puntaje de su nodo PREGUNTA.
 * `SI_NO` (modalidad FIJO): puntaje completo si `valor === "SI"`, si no 0.
 * `POR_OPCIONES`: suma el puntaje de las opciones seleccionadas (`valores`, o `valor` si es única).
 * `MANUAL`/`PUNTAJE_MANUAL`: el número ingresado, acotado a `puntajeMaximo` (nunca negativo).
 * Cualquier otro caso (texto libre, numérico sin modalidad de puntaje): 0.
 *
 * @param nodo - Nodo PREGUNTA de la plantilla (con `puntajeMaximo`/`opciones` ya resueltos).
 * @param valor - Respuesta de selección única / SI_NO / numérica / puntaje manual.
 * @param valores - Respuesta de selección múltiple (ids de opciones marcadas).
 * @returns Puntaje obtenido, entre 0 y `nodo.puntajeMaximo`.
 * @example
 *   calcularPuntajeRespuesta({ tipoRespuesta: "SI_NO", puntajeMaximo: 10, opciones: [] }, "SI")  // → 10
 */
export function calcularPuntajeRespuesta(
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
