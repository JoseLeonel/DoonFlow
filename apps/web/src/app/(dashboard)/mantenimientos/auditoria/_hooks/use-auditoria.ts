"use client";

import { useCallback, useEffect, useState } from "react";
import { listarAuditoria } from "../_servicios/auditoria.servicio";
import type { RegistroAuditoria } from "../_servicios/auditoria.servicio";

export interface FiltrosAuditoriaUI {
  usuarioId: string;
  accion: string;
  desde: string;
  hasta: string;
}

const FILTROS_VACIOS: FiltrosAuditoriaUI = { usuarioId: "", accion: "", desde: "", hasta: "" };

export function useAuditoria() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(20);
  const [filtros, setFiltros] = useState<FiltrosAuditoriaUI>(FILTROS_VACIOS);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { items, total } = await listarAuditoria({
        usuarioId: filtros.usuarioId || undefined,
        accion: filtros.accion || undefined,
        desde: filtros.desde || undefined,
        hasta: filtros.hasta || undefined,
        pagina,
        porPagina,
      });
      setRegistros(items);
      setTotal(total);
    } catch {
      setError("No se pudo cargar el registro de auditoría.");
    } finally {
      setCargando(false);
    }
  }, [filtros, pagina, porPagina]);

  useEffect(() => { recargar(); }, [recargar]);

  function aplicarFiltros(nuevosFiltros: FiltrosAuditoriaUI) {
    setFiltros(nuevosFiltros);
    setPagina(1);
  }

  function cambiarPagina(nuevaPagina: number) {
    setPagina(nuevaPagina);
  }

  function cambiarPorPagina(nuevoPorPagina: number) {
    setPorPagina(nuevoPorPagina);
    setPagina(1);
  }

  return { registros, total, pagina, porPagina, filtros, cargando, error, aplicarFiltros, cambiarPagina, cambiarPorPagina };
}
