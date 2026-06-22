import type { RolSistema } from "../constants/roles";

/** Representación pública del usuario autenticado (sin datos sensibles). */
export interface UsuarioAutenticado {
  id: string;
  empresaId: string;
  email: string;
  nombre: string;
  rol: RolSistema;
  activo: boolean;
}
