"use client";

import { useCallback, useEffect, useState } from "react";
import {
  crearSucursal,
  listarSucursales,
  toggleEstadoSucursal,
  actualizarSucursal,
} from "../_servicios/sucursal.servicio";
import type { DatosGuardarSucursal, Sucursal } from "../_servicios/sucursal.servicio";

export function usarSucursales(clienteId: string) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargando,   setCargando]   = useState(true);
  const [guardando,  setGuardando]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setSucursales(await listarSucursales(clienteId));
    } catch {
      setError("No se pudo cargar la lista de sucursales.");
    } finally {
      setCargando(false);
    }
  }, [clienteId]);

  useEffect(() => { recargar(); }, [recargar]);

  const crear = async (datos: Omit<DatosGuardarSucursal, "clienteId">) => {
    setGuardando(true);
    setError(null);
    try {
      const nueva = await crearSucursal({ ...datos, clienteId });
      setSucursales((prev) => [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      return nueva;
    } catch (e: any) {
      setError(e.message ?? "Error al crear la sucursal.");
      throw e;
    } finally {
      setGuardando(false);
    }
  };

  const actualizar = async (id: string, datos: Omit<DatosGuardarSucursal, "clienteId">) => {
    setGuardando(true);
    setError(null);
    try {
      const actualizada = await actualizarSucursal(id, datos);
      setSucursales((prev) => prev.map((s) => (s.id === id ? actualizada : s)));
      return actualizada;
    } catch (e: any) {
      setError(e.message ?? "Error al actualizar la sucursal.");
      throw e;
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = async (id: string, activo: boolean) => {
    await toggleEstadoSucursal(id, activo);
    setSucursales((prev) => prev.map((s) => (s.id === id ? { ...s, activo } : s)));
  };

  return { sucursales, cargando, guardando, error, recargar, crear, actualizar, toggleEstado };
}
