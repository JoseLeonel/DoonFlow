"use client";

import { useCallback, useEffect, useState } from "react";
import { listarHistorial, obtenerUrlDescarga } from "../_servicios/reportes.servicio";
import type { ReporteHistorialItem, TipoReporte } from "../_servicios/reportes.servicio";

export interface FiltrosHistorialUI {
  tipo: TipoReporte | "";
}

export function usarHistorialReportes() {
  const [reportes, setReportes] = useState<ReporteHistorialItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(20);
  const [filtros, setFiltros] = useState<FiltrosHistorialUI>({ tipo: "" });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { items, total } = await listarHistorial({
        tipo: filtros.tipo || undefined,
        pagina,
        porPagina,
      });
      setReportes(items);
      setTotal(total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el historial de reportes.");
    } finally {
      setCargando(false);
    }
  }, [filtros, pagina, porPagina]);

  useEffect(() => { recargar(); }, [recargar]);

  function cambiarFiltros(nuevosFiltros: FiltrosHistorialUI) {
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

  async function descargar(id: string) {
    const url = await obtenerUrlDescarga(id);
    window.open(url, "_blank");
  }

  return { reportes, total, pagina, porPagina, filtros, cargando, error, recargar, cambiarFiltros, cambiarPagina, cambiarPorPagina, descargar };
}
