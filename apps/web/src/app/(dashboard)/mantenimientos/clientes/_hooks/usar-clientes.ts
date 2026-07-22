"use client";

import { useCallback, useEffect, useState } from "react";
import { listarClientes, toggleEstadoCliente } from "../_servicios/cliente.servicio";
import type { Cliente } from "../_servicios/cliente.servicio";

export function usarClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total,    setTotal]    = useState(0);
  const [pagina,   setPagina]   = useState(1);
  const [porPagina, setPorPagina] = useState(20);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { items, total } = await listarClientes(pagina, porPagina);
      setClientes(items);
      setTotal(total);
    } catch {
      setError("No se pudo cargar la lista de clientes.");
    } finally {
      setCargando(false);
    }
  }, [pagina, porPagina]);

  useEffect(() => { recargar(); }, [recargar]);

  const cambiarEstado = async (id: string, activar: boolean) => {
    await toggleEstadoCliente(id, activar);
    setClientes((prev) => prev.map((c) => c.id === id ? { ...c, activo: activar } : c));
  };

  function cambiarPagina(nuevaPagina: number) {
    setPagina(nuevaPagina);
  }

  function cambiarPorPagina(nuevoPorPagina: number) {
    setPorPagina(nuevoPorPagina);
    setPagina(1);
  }

  return { clientes, total, pagina, porPagina, cargando, error, recargar, cambiarEstado, cambiarPagina, cambiarPorPagina };
}
