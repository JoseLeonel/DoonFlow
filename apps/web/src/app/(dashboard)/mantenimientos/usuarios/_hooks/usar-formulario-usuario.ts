"use client";

import { useCallback, useState } from "react";
import { listarSucursales } from "../../clientes/_servicios/sucursal.servicio";
import type { Sucursal } from "../../clientes/_servicios/sucursal.servicio";

/**
 * Estado del bloque condicional de alcance (Cliente/Sucursal) del formulario de usuario.
 * Cambiar el rol resetea clienteId/sucursalId/sucursalesAdicionalesIds — el bloque
 * condicional anterior no debe sobrevivir a un cambio de rol.
 */
export function usarFormularioUsuario() {
  const [rolId, setRolId] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [sucursalId, setSucursalId] = useState<string | null>(null);
  const [sucursalesAdicionalesIds, setSucursalesAdicionalesIds] = useState<string[]>([]);
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState<Sucursal[]>([]);
  const [cargandoSucursales, setCargandoSucursales] = useState(false);

  const cambiarRol = useCallback((nuevoRolId: string) => {
    setRolId(nuevoRolId);
    setClienteId(null);
    setSucursalId(null);
    setSucursalesAdicionalesIds([]);
    setSucursalesDisponibles([]);
  }, []);

  /** Rol administrador_cliente: solo fija el cliente, sin cargar sucursales. */
  const seleccionarCliente = useCallback((nuevoClienteId: string | null) => {
    setClienteId(nuevoClienteId);
  }, []);

  /** Rol usuario_sucursal: el cliente es solo un filtro — dispara la carga de sus sucursales. */
  const seleccionarClienteFiltro = useCallback(async (nuevoClienteId: string | null) => {
    setClienteId(nuevoClienteId);
    setSucursalId(null);
    setSucursalesAdicionalesIds([]);
    if (!nuevoClienteId) {
      setSucursalesDisponibles([]);
      return;
    }
    setCargandoSucursales(true);
    try {
      setSucursalesDisponibles(await listarSucursales(nuevoClienteId));
    } finally {
      setCargandoSucursales(false);
    }
  }, []);

  return {
    rolId,
    clienteId,
    sucursalId,
    sucursalesAdicionalesIds,
    sucursalesDisponibles,
    cargandoSucursales,
    cambiarRol,
    seleccionarCliente,
    seleccionarClienteFiltro,
    setSucursalId,
    setSucursalesAdicionalesIds,
  };
}
