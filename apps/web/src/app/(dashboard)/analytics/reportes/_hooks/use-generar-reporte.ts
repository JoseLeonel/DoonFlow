"use client";

import { useCallback, useState } from "react";
import {
  generarReporte,
  obtenerPreviewComparativo,
  obtenerPreviewConsolidado,
} from "../_servicios/reportes.servicio";
import type {
  DatosComparativoSucursales,
  DatosConsolidadoCliente,
  FormatoReporte,
  ReporteGenerado,
  TipoReporte,
} from "../_servicios/reportes.servicio";

/** Estado y acciones de la pantalla "Generar reporte" (`/analytics/reportes/nuevo`). */
export function useGenerarReporte() {
  const [tipo, setTipo] = useState<TipoReporte>("CONSOLIDADO_CLIENTE");
  const [clienteId, setClienteId] = useState("");
  const [sucursalIds, setSucursalIds] = useState<string[]>([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [formato, setFormato] = useState<FormatoReporte>("PDF");

  const [previsualizando, setPrevisualizando] = useState(false);
  const [datosPreview, setDatosPreview] = useState<DatosConsolidadoCliente | DatosComparativoSucursales | null>(null);
  const [filtrosDelPreview, setFiltrosDelPreview] = useState<string | null>(null);

  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claveFiltrosActual = JSON.stringify({ tipo, clienteId, sucursalIds, fechaDesde, fechaHasta });
  const previewDesactualizado = datosPreview !== null && filtrosDelPreview !== claveFiltrosActual;

  /** Cambia cualquier filtro — invalida el preview ya cargado (no se exporta con filtros no confirmados). */
  function cambiarFiltro<T>(setter: (valor: T) => void) {
    return (valor: T) => setter(valor);
  }

  const cargarPreview = useCallback(async () => {
    setPrevisualizando(true);
    setError(null);
    try {
      const datos = tipo === "CONSOLIDADO_CLIENTE"
        ? await obtenerPreviewConsolidado(clienteId, fechaDesde, fechaHasta)
        : await obtenerPreviewComparativo(clienteId, sucursalIds, fechaDesde, fechaHasta);
      setDatosPreview(datos);
      setFiltrosDelPreview(claveFiltrosActual);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la vista previa.");
    } finally {
      setPrevisualizando(false);
    }
  }, [tipo, clienteId, sucursalIds, fechaDesde, fechaHasta, claveFiltrosActual]);

  const generar = useCallback(async (): Promise<{ reporte: ReporteGenerado; urlDescarga: string } | null> => {
    setGenerando(true);
    setError(null);
    try {
      return await generarReporte({ tipo, formato, clienteId, sucursalIds: tipo === "COMPARATIVO_SUCURSALES" ? sucursalIds : undefined, fechaDesde, fechaHasta });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el reporte.");
      return null;
    } finally {
      setGenerando(false);
    }
  }, [tipo, formato, clienteId, sucursalIds, fechaDesde, fechaHasta]);

  function reiniciar() {
    setTipo("CONSOLIDADO_CLIENTE");
    setClienteId("");
    setSucursalIds([]);
    setFechaDesde("");
    setFechaHasta("");
    setFormato("PDF");
    setDatosPreview(null);
    setFiltrosDelPreview(null);
    setError(null);
  }

  return {
    tipo, setTipo: cambiarFiltro(setTipo),
    clienteId, setClienteId: cambiarFiltro(setClienteId),
    sucursalIds, setSucursalIds: cambiarFiltro(setSucursalIds),
    fechaDesde, setFechaDesde: cambiarFiltro(setFechaDesde),
    fechaHasta, setFechaHasta: cambiarFiltro(setFechaHasta),
    formato, setFormato: cambiarFiltro(setFormato),
    previsualizando, datosPreview, previewDesactualizado,
    generando, error,
    cargarPreview, generar, reiniciar,
  };
}
