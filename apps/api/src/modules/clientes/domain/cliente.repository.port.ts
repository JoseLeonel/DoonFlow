import type { Cliente } from "./cliente.entity";

/**
 * Alcance de visibilidad del usuario autenticado, definido localmente (no importado desde
 * `middleware/alcance.middleware.ts` ni desde el dominio de `auth`) — regla de dependencia
 * hexagonal: cada módulo define sus propios tipos de entrada.
 */
export type AlcanceConsulta =
  | { tipo: "TOTAL" }
  | { tipo: "CLIENTE"; clienteId: string }
  | { tipo: "SUCURSAL"; sucursalIds: string[] };

export interface DatosCrearCliente {
  empresaId: string;
  nombreResponsable: string;
  empresa: string;
  identificacionEmpresa?: string | null;
  correo1: string;
  correo2?: string | null;
  correo3?: string | null;
  direccion?: string | null;
  movil?: string | null;
}

export interface Paginacion {
  pagina: number;
  porPagina: number;
}

export interface ResultadoPaginado<T> {
  items: T[];
  total: number;
}

export interface ClienteRepositoryPort {
  /**
   * Lista los clientes de la empresa dentro del alcance del usuario, paginado server-side
   * (010-seguridad-privacidad-continuidad, HU-3), ordenados por empresa ASC, nombreResponsable ASC.
   * El filtro de alcance se aplica siempre antes de paginar (regla de negocio 5 del spec).
   */
  listar(empresaId: string, alcance: AlcanceConsulta | undefined, paginacion: Paginacion): Promise<ResultadoPaginado<Cliente>>;

  /** Retorna el cliente o null si no existe / no pertenece a la empresa o al alcance del usuario. */
  obtenerPorId(id: string, empresaId: string, alcance?: AlcanceConsulta): Promise<Cliente | null>;

  /** Crea un nuevo cliente y lo retorna. */
  crear(datos: DatosCrearCliente): Promise<Cliente>;

  /** Actualiza campos parciales del cliente y lo retorna. */
  actualizar(id: string, empresaId: string, datos: Partial<Omit<DatosCrearCliente, "empresaId">>): Promise<Cliente>;

  /** Cambia el estado activo/inactivo del cliente. */
  cambiarEstado(id: string, empresaId: string, activo: boolean): Promise<Cliente>;

  /** Retorna true si ya existe otro cliente con esa identificacionEmpresa en la misma empresa. */
  existeIdentificacion(empresaId: string, identificacionEmpresa: string, excluirId?: string): Promise<boolean>;

  /** Busca un cliente por su identificacionEmpresa dentro de la empresa — usado por la importación masiva de sucursales (009) para resolver clienteId. */
  buscarPorIdentificacion(identificacion: string, empresaId: string): Promise<Cliente | null>;
}
