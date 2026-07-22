import type { Certificacion } from "./certificacion.entity";
import type { NodoArbol, RangoResultado } from "./plantilla.entity";

/** Alcance de visibilidad del usuario autenticado — definido localmente (mismo patrón que `clientes`/`sucursales`). */
export type AlcanceConsulta =
  | { tipo: "TOTAL" }
  | { tipo: "CLIENTE"; clienteId: string }
  | { tipo: "SUCURSAL"; sucursalIds: string[] };

export interface DatosIniciarCertificacion {
  empresaId: string;
  plantillaId: string;
  plantillaVersion: number;
  inspectorId: string;
  sucursalId: string;
  periodoEtiqueta: string;
}

export interface DatosRespuestaGuardar {
  nodoId: string;
  rutaCodigos: string;
  rutaTitulos: string;
  preguntaTitulo: string;
  criterioSnapshot?: string | null;
  tipoRespuesta: string;
  valor?: string | null;
  valores?: string[];
  comentario?: string | null;
  puntajeObtenido: number;
  puntajeMaximo: number;
}

export interface DetalleGuardado {
  id: string;
  nodoId: string;
  valor: string | null;
  valores: string[];
  comentario: string | null;
  puntajeObtenido: number;
  puntajeMaximo: number;
}

export interface EvidenciaGuardada {
  id: string;
  detalleId: string | null;
  tipo: string;
  url: string;
  nombre: string;
}

export interface CertificacionCompleta extends Certificacion {
  plantilla: { id: string; nombre: string; puntajeMaximo: number; nodos: NodoArbol[]; rangosResultado: RangoResultado[] };
  detalles: DetalleGuardado[];
  evidencias: EvidenciaGuardada[];
}

export interface FiltroCertificacion {
  empresaId: string;
  alcance?: AlcanceConsulta;
  sucursalId?: string;
  estado?: string;
  pagina?: number;
  porPagina?: number;
}

/** 012-captura-offline-campo — una respuesta pendiente de sincronizar del lote enviado por el cliente. */
export interface DetallePendienteSincronizar extends DatosRespuestaGuardar {
  capturadoEnCliente: Date;
}

/** 012-captura-offline-campo — resultado de aplicar (o no) una respuesta pendiente contra el servidor. */
export interface ResultadoUpsertDetalle {
  detalle: DetalleGuardado;
  aplicado: boolean;
  conflicto: boolean;
}

export interface CertificacionRepositoryPort {
  /** Crea la certificación (Inspeccion) en EN_PROGRESO con la plantilla vigente congelada. */
  iniciar(datos: DatosIniciarCertificacion): Promise<Certificacion>;

  /** Certificación completa: cabecera + árbol de nodos de la plantilla + respuestas + evidencias. */
  obtenerCompleta(id: string, empresaId: string, alcance?: AlcanceConsulta): Promise<CertificacionCompleta | null>;

  /**
   * Lista certificaciones de la empresa acotadas por alcance y filtros opcionales, paginado
   * server-side (010-seguridad-privacidad-continuidad, HU-3).
   */
  listar(filtro: FiltroCertificacion): Promise<{ items: Certificacion[]; total: number }>;

  /** Reemplaza (upsert) las respuestas de los `nodoId` indicados para esta certificación. */
  guardarRespuestasSeccion(inspeccionId: string, respuestas: DatosRespuestaGuardar[]): Promise<DetalleGuardado[]>;

  /** Guarda una evidencia ya subida y la asocia a un detalle de respuesta. */
  guardarEvidencia(inspeccionId: string, detalleId: string, datos: { tipo: string; url: string; nombre: string; tamanoBytes?: number }): Promise<EvidenciaGuardada>;

  /** Sucursal (con su cliente) usada para validar que está dentro del alcance del usuario. */
  obtenerSucursalParaAlcance(sucursalId: string, empresaId: string): Promise<{ id: string; clienteId: string; activo: boolean } | null>;

  /**
   * 012-captura-offline-campo — upsert idempotente de un lote de respuestas pendientes de
   * sincronizar, resolviendo conflicto por última escritura: si `InspeccionDetalle.actualizadoEn`
   * en servidor ya es más reciente que `capturadoEnCliente` de una fila, esa fila no se
   * sobrescribe (`conflicto: true`). Todo el lote se envuelve en una única transacción Prisma
   * para que un fallo a mitad de lote no deje registros a medio escribir.
   */
  upsertDetallesConResolucionConflicto(
    inspeccionId: string,
    empresaId: string,
    detalles: DetallePendienteSincronizar[],
  ): Promise<ResultadoUpsertDetalle[]>;

  /** 012-captura-offline-campo — marca la certificación como sincronizada por completo. */
  marcarSincronizado(inspeccionId: string, empresaId: string, fecha: Date, capturaOffline: boolean): Promise<void>;
}
