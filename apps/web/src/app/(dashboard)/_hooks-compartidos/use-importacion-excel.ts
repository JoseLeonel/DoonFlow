"use client";

import { useState } from "react";
import {
  confirmarImportacion,
  descargarErroresLote,
  descargarPlantilla,
  previsualizarImportacion,
} from "../_servicios-compartidos/importacion.servicio";
import type { ImportacionLote, ResultadoPrevisualizacion, TipoImportacion } from "../_servicios-compartidos/importacion.servicio";

export type EstadoImportacion =
  | "INACTIVO"
  | "ARCHIVO_SELECCIONADO"
  | "PREVISUALIZANDO"
  | "PREVISUALIZADO"
  | "CONFIRMANDO"
  | "COMPLETADO";

/** Máquina de estados del flujo "Importar desde Excel" — reutilizada por Clientes y Sucursales, solo cambia `tipo`. */
export function useImportacionExcel(tipo: TipoImportacion) {
  const [estado, setEstado] = useState<EstadoImportacion>("INACTIVO");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<ResultadoPrevisualizacion | null>(null);
  const [lote, setLote] = useState<ImportacionLote | null>(null);
  const [error, setError] = useState<string | null>(null);

  function seleccionarArchivo(file: File) {
    setArchivo(file);
    setPreview(null);
    setError(null);
    setEstado("ARCHIVO_SELECCIONADO");
  }

  async function previsualizar() {
    if (!archivo) return;
    setEstado("PREVISUALIZANDO");
    setError(null);
    try {
      setPreview(await previsualizarImportacion(tipo, archivo));
      setEstado("PREVISUALIZADO");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo previsualizar el archivo.");
      setEstado("ARCHIVO_SELECCIONADO");
    }
  }

  async function confirmar() {
    if (!archivo) return;
    setEstado("CONFIRMANDO");
    setError(null);
    try {
      setLote(await confirmarImportacion(tipo, archivo));
      setEstado("COMPLETADO");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo confirmar la importación.");
      setEstado("PREVISUALIZADO");
    }
  }

  function reiniciar() {
    setEstado("INACTIVO");
    setArchivo(null);
    setPreview(null);
    setLote(null);
    setError(null);
  }

  async function descargarPlantillaDelTipo() {
    await descargarPlantilla(tipo);
  }

  async function descargarErrores() {
    if (lote) await descargarErroresLote(lote.id);
  }

  const resumen = preview
    ? { totalFilas: preview.totalFilas, filasValidas: preview.filasValidas.length, filasConError: preview.filasConError.length }
    : null;
  const puedeConfirmar = !!preview && preview.filasValidas.length > 0;

  return {
    estado, archivo, preview, lote, error, resumen, puedeConfirmar,
    seleccionarArchivo, previsualizar, confirmar, reiniciar,
    descargarPlantilla: descargarPlantillaDelTipo, descargarErrores,
  };
}
