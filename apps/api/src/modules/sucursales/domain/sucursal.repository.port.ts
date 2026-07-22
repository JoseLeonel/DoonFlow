import type { RegistroCertificacion } from "@doonflow/shared";
import type { Sucursal } from "./sucursal.entity";

/** Alcance de visibilidad del usuario autenticado, definido localmente (mismo patrón que `clientes`). */
export type AlcanceConsulta =
  | { tipo: "TOTAL" }
  | { tipo: "CLIENTE"; clienteId: string }
  | { tipo: "SUCURSAL"; sucursalIds: string[] };

export interface DatosCrearSucursal {
  empresaId: string;
  clienteId: string;
  nombre: string;
  direccion?: string | null;
  correo?: string | null;
  movil?: string | null;
}

export interface PuntajeVigente {
  puntaje: number;
  clasificacion: string | null;
}

export interface Paginacion {
  pagina: number;
  porPagina: number;
}

export interface ResultadoPaginado<T> {
  items: T[];
  total: number;
}

export interface SucursalRepositoryPort {
  /**
   * Lista las sucursales del cliente (activas e inactivas) dentro del alcance del usuario,
   * paginado server-side (010-seguridad-privacidad-continuidad, HU-3), ordenadas por nombre ASC.
   */
  listarPorCliente(clienteId: string, empresaId: string, alcance: AlcanceConsulta | undefined, paginacion: Paginacion): Promise<ResultadoPaginado<Sucursal>>;

  /** Retorna la sucursal o null si no existe / no pertenece a la empresa o al alcance del usuario. */
  obtenerPorId(id: string, empresaId: string, alcance?: AlcanceConsulta): Promise<Sucursal | null>;

  /** Crea una nueva sucursal y la retorna. */
  crear(datos: DatosCrearSucursal): Promise<Sucursal>;

  /** Actualiza campos parciales de la sucursal (clienteId no editable) y la retorna. */
  actualizar(id: string, empresaId: string, datos: Partial<Omit<DatosCrearSucursal, "empresaId" | "clienteId">>): Promise<Sucursal>;

  /** Cambia el estado activo/inactivo de la sucursal. */
  cambiarEstado(id: string, empresaId: string, activo: boolean): Promise<Sucursal>;

  /** Histórico de certificaciones de la sucursal, ordenado de más reciente a más antigua. */
  obtenerHistoricoCertificaciones(sucursalId: string, empresaId: string): Promise<RegistroCertificacion[]>;

  /** Puntaje/clasificación de la inspección más reciente, o null si no hay ninguna. */
  obtenerPuntajeVigente(sucursalId: string, empresaId: string): Promise<PuntajeVigente | null>;
}
