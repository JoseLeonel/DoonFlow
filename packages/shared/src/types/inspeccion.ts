export type TipoInspeccion =
  | "MINISTERIO_SALUD" | "AUDITORIA_INTERNA" | "CALIDAD"
  | "SEGURIDAD_OCUPACIONAL" | "SUPERVISION_OPERATIVA" | "OTRO";

export type TipoNodo = "PANEL" | "PREGUNTA";

export type TipoRespuesta =
  | "SI_NO" | "SELECCION_UNICA" | "SELECCION_MULTIPLE"
  | "TEXTO_LIBRE" | "NUMERICO" | "PUNTAJE_MANUAL";

export type ModalidadPuntaje = "FIJO" | "PARCIAL" | "MANUAL" | "POR_OPCIONES";

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
  fechaVigencia?: string;
  observaciones?: string;
  version: number;
  creadoEn: string;
  actualizadoEn: string;
  estadoAprobacion: EstadoAprobacionPlantilla;
  solicitadoPorId?: string | null;
  solicitadoEn?: string | null;
  aprobadorId?: string | null;
  resueltoEn?: string | null;
  comentarioResolucion?: string | null;
}

export interface RangoResultado {
  id: string;
  desde: number;
  hasta: number;
  clasificacion: string;
  color: string;
  orden: number;
}

export interface NodoOpcion {
  id: string;
  etiqueta: string;
  criterio?: string;
  puntaje: number;
  orden: number;
}

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
  tipoRespuesta?: TipoRespuesta;
  modalidadPuntaje?: ModalidadPuntaje;
  puntajeMaximo: number;
  evidenciaObligatoria: boolean;
  evidenciaMinima: number;
  evidenciaMaxima: number;
  opciones: NodoOpcion[];
  hijos: NodoArbol[];
}

export interface PlantillaCompleta extends Plantilla {
  nodos: NodoArbol[];
  rangosResultado: RangoResultado[];
}

export interface ListaPlantillas {
  items: Plantilla[];
  total: number;
  pagina: number;
  porPagina: number;
}
