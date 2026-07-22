import { ROL_ADMINISTRADOR_CLIENTE, ROL_USUARIO_SUCURSAL, type RolSistema } from "@doonflow/shared";

/** Entidad de dominio — usuario con su rol resuelto. Sin dependencias de Express/Prisma. */
export interface UsuarioConRol {
  id: string;
  empresaId: string;
  authUserId: string;
  email: string;
  nombre: string;
  rol: RolSistema;
  activo: boolean;
  clienteId?: string | null;
  sucursalId?: string | null;
  sucursalesAdicionalesIds?: string[];
}

/** Regla de negocio pura: un usuario inactivo nunca puede iniciar sesión. */
export function puedeIniciarSesion(usuario: UsuarioConRol): boolean {
  return usuario.activo;
}

/** Solo el rol administrador_cliente tiene alcance de Cliente completo. */
export function requiereClienteId(rol: RolSistema): boolean {
  return rol === ROL_ADMINISTRADOR_CLIENTE;
}

/** Solo el rol usuario_sucursal tiene alcance acotado a sucursal(es). */
export function requiereSucursalId(rol: RolSistema): boolean {
  return rol === ROL_USUARIO_SUCURSAL;
}

/**
 * Reglas 2-4 del spec: valida que clienteId/sucursalId correspondan al rol.
 * Retorna un mensaje de error o null si la combinación es válida.
 * No valida la regla 4 (sucursal_requerida cuando falta también el acceso adicional) —
 * esa depende de `usuario_sucursal_acceso`, que no es síncrono; se valida en el caso de uso.
 */
export function validarAlcancePorRol(usuario: {
  rol: RolSistema;
  clienteId: string | null;
  sucursalId: string | null;
}): string | null {
  const necesitaCliente = requiereClienteId(usuario.rol);
  const necesitaSucursal = requiereSucursalId(usuario.rol);

  if (!necesitaCliente && usuario.clienteId) {
    return `El rol "${usuario.rol}" no admite un cliente asignado.`;
  }
  if (necesitaCliente && !usuario.clienteId) {
    return `El rol "${usuario.rol}" requiere un cliente asignado.`;
  }
  if (!necesitaSucursal && usuario.sucursalId) {
    return `El rol "${usuario.rol}" no admite una sucursal asignada.`;
  }
  return null;
}

export type AlcanceUsuario =
  | { tipo: "TOTAL" }
  | { tipo: "CLIENTE"; clienteId: string }
  | { tipo: "SUCURSAL"; sucursalIds: string[] };

/** Deriva el alcance efectivo de un usuario para filtrar consultas de otros módulos. */
export function calcularAlcance(usuario: UsuarioConRol, sucursalesAdicionales: string[]): AlcanceUsuario {
  if (requiereClienteId(usuario.rol) && usuario.clienteId) {
    return { tipo: "CLIENTE", clienteId: usuario.clienteId };
  }
  if (requiereSucursalId(usuario.rol)) {
    const ids = [usuario.sucursalId, ...sucursalesAdicionales].filter((id): id is string => Boolean(id));
    return { tipo: "SUCURSAL", sucursalIds: ids };
  }
  return { tipo: "TOTAL" };
}
