import type { HallazgoFrecuente } from "./hallazgo-frecuente.entity";

export interface DatosCrearHallazgoFrecuente {
  empresaId: string;
  descripcionHallazgo: string;
  severidadSugerida: string;
  descripcionAccionSugerida?: string | null;
}

export interface DatosActualizarHallazgoFrecuente {
  descripcionHallazgo?: string;
  severidadSugerida?: string;
  descripcionAccionSugerida?: string | null;
}

export interface FiltrosHallazgoFrecuente {
  soloActivos?: boolean;
}

export interface HallazgoFrecuenteRepositoryPort {
  /** Lista los hallazgos frecuentes de la empresa, opcionalmente solo los activos. */
  listar(empresaId: string, filtros: FiltrosHallazgoFrecuente): Promise<HallazgoFrecuente[]>;
  /** Obtiene un hallazgo frecuente por id, o `null` si no existe o pertenece a otra empresa. */
  obtenerPorId(id: string, empresaId: string): Promise<HallazgoFrecuente | null>;
  /** Crea un hallazgo frecuente nuevo en estado activo. */
  crear(datos: DatosCrearHallazgoFrecuente): Promise<HallazgoFrecuente>;
  /** Actualiza solo los campos enviados. */
  actualizar(id: string, empresaId: string, datos: DatosActualizarHallazgoFrecuente): Promise<HallazgoFrecuente>;
  /** Activa o desactiva el hallazgo frecuente (nunca se elimina físicamente). */
  cambiarEstado(id: string, empresaId: string, activo: boolean): Promise<HallazgoFrecuente>;
}
