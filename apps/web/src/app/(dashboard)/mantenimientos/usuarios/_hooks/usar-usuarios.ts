"use client";

import { useCallback, useEffect, useState } from "react";
import { listarUsuarios, toggleEstadoUsuario } from "../_servicios/usuario.servicio";
import type { UsuarioConAlcance } from "../_servicios/usuario.servicio";

export function usarUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioConAlcance[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setUsuarios(await listarUsuarios());
    } catch {
      setError("No se pudo cargar la lista de usuarios.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { recargar(); }, [recargar]);

  const cambiarEstado = async (id: string, activar: boolean) => {
    await toggleEstadoUsuario(id, activar);
    setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, activo: activar } : u));
  };

  return { usuarios, cargando, error, recargar, cambiarEstado };
}
