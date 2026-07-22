import type { RolSistema } from "../constants/roles";

/** Representación pública del usuario autenticado (sin datos sensibles). */
export interface UsuarioAutenticado {
  id: string;
  empresaId: string;
  email: string;
  nombre: string;
  rol: RolSistema;
  activo: boolean;
  clienteId?: string | null;
  sucursalId?: string | null;
}

/** Usuario para CRUD/listado en `/mantenimientos/usuarios`. */
export interface Usuario {
  id: string;
  empresaId: string;
  email: string;
  nombre: string;
  rolId: string;
  rolNombre: RolSistema;
  clienteId?: string | null;
  sucursalId?: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

/** Respuesta enriquecida de listado/detalle: nombres resueltos + sucursales adicionales. */
export interface UsuarioConAlcance extends Usuario {
  clienteNombre?: string | null;
  sucursalNombre?: string | null;
  sucursalesAdicionales: { id: string; nombre: string }[];
}

export type TipoAlcance = "TOTAL" | "CLIENTE" | "SUCURSAL";

/** Respuesta de GET /auth/me. */
export interface SesionActual {
  usuario: { id: string; email: string; nombre: string; rol: RolSistema };
  alcance:
    | { tipo: "TOTAL" }
    | { tipo: "CLIENTE"; cliente: { id: string; empresa: string } }
    | { tipo: "SUCURSAL"; sucursales: { id: string; nombre: string }[] };
}
