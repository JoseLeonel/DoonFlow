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
  fechaInicioPeriodo: Date;
  fechaFinPeriodo: Date;
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
  /** Siempre visibles en el wizard (ambas respuestas Sí/No) — 2026-07-25, reemplaza al comentario único condicional anterior. */
  comentarioReconocimiento?: string | null;
  comentarioObservacion?: string | null;
  comentarioOportunidadMejora?: string | null;
  puntajeObtenido: number;
  puntajeMaximo: number;
}

export interface DetalleGuardado {
  id: string;
  nodoId: string;
  /** 013-hallazgos-plan-cumplimiento — usado como base de la descripción de hallazgos automáticos. */
  preguntaTitulo: string;
  valor: string | null;
  valores: string[];
  comentarioReconocimiento: string | null;
  comentarioObservacion: string | null;
  comentarioOportunidadMejora: string | null;
  puntajeObtenido: number;
  puntajeMaximo: number;
}

export interface EvidenciaGuardada {
  id: string;
  detalleId: string | null;
  tipo: string;
  url: string;
  nombre: string;
  /** 013-hallazgos-plan-cumplimiento — necesario para la galería de evidencias consolidada. */
  creadoEn: Date;
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

  /**
   * Certificación más reciente de esta sucursal+plantilla cuyo período todavía no venció
   * (`fechaFinPeriodo >= hoy`), si existe — usada para bloquear el inicio de una nueva mientras
   * la anterior siga vigente (encontrado en pruebas manuales, 2026-07-24: antes no había ninguna
   * validación y se podían crear certificaciones duplicadas/superpuestas para la misma sucursal).
   */
  buscarPeriodoVigente(sucursalId: string, plantillaId: string, empresaId: string, hoy: Date): Promise<{ id: string; fechaFinPeriodo: Date } | null>;

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
  obtenerSucursalParaAlcance(sucursalId: string, empresaId: string): Promise<{ id: string; nombre: string; clienteId: string; activo: boolean } | null>;

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

  /**
   * Persiste el puntaje/porcentaje/clasificación recalculados tras guardar respuestas —
   * encontrado en pruebas manuales (2026-07-24): antes de esto, la `Inspeccion` solo recibía
   * estos valores al firmar (`sp_inspeccion_firmar`), así que el listado de "Todas las
   * certificaciones" siempre mostraba 0/0/0%/— para cualquier certificación `EN_PROGRESO`, sin
   * importar cuánto se hubiera avanzado. No cambia `estado` ni ningún campo de firma.
   */
  actualizarResumenProgreso(inspeccionId: string, resumen: { puntajeObtenido: number; puntajeMaximo: number; porcentajeCumplimiento: number; clasificacion: string | null }): Promise<void>;

  /**
   * 005-certificacion-plan-cumplimiento — firma la certificación vía `sp_inspeccion_firmar`:
   * recalcula puntaje/porcentaje/clasificación, fija `resultadoFinal` y `fechaVencimiento`,
   * y persiste el código de verificación dado. Lanza si la fila no existe, si `estado` no es
   * `EN_PROGRESO`, o si `codigoVerificacion` colisiona con uno existente (el caso de uso decide
   * si reintenta con un código nuevo).
   */
  firmar(inspeccionId: string, usuarioId: string, codigoVerificacion: string): Promise<Certificacion>;

  /** 005-certificacion-plan-cumplimiento — persiste la URL del PDF ya generado tras la firma. */
  establecerPdfUrl(inspeccionId: string, pdfUrl: string): Promise<Certificacion>;

  /**
   * Cierre liviano ("Guardar y finalizar", 2026-07-24): pone `estado = FINALIZADA` y
   * `fechaFin = ahora`, sin PDF/código de verificación/vigencia (eso es exclusivo de `firmar`).
   */
  finalizar(inspeccionId: string): Promise<Certificacion>;

  /**
   * 011-aceptacion-apelaciones-certificacion — el cliente reconoce el resultado de una
   * certificación ya `FIRMADA`. No cambia `estado`, es puramente informativo.
   */
  aceptar(inspeccionId: string, usuarioId: string): Promise<Certificacion>;

  /**
   * 011-aceptacion-apelaciones-certificacion — persiste el `resultadoFinal` recalculado tras
   * aceptar una apelación `SOBRE_HALLAZGO` (excluyendo del cálculo los hallazgos anulados).
   */
  actualizarResultadoFinal(inspeccionId: string, resultadoFinal: string): Promise<Certificacion>;
}
