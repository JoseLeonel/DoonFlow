"use client";

import { useRef } from "react";
import { cn } from "@doonflow/shared";
import { Boton } from "@doonflow/ui";
import type { ImportacionLote, ResultadoPrevisualizacion, TipoImportacion } from "../_servicios-compartidos/importacion.servicio";
import type { EstadoImportacion } from "../_hooks-compartidos/usar-importacion-excel";

const TITULO_POR_TIPO: Record<TipoImportacion, string> = {
  CLIENTE: "Importar clientes desde Excel",
  SUCURSAL: "Importar sucursales desde Excel",
};

interface Props {
  abierto: boolean;
  tipo: TipoImportacion;
  estado: EstadoImportacion;
  archivo: File | null;
  preview: ResultadoPrevisualizacion | null;
  lote: ImportacionLote | null;
  error: string | null;
  resumen: { totalFilas: number; filasValidas: number; filasConError: number } | null;
  puedeConfirmar: boolean;
  onCerrar: () => void;
  onDescargarPlantilla: () => void;
  onSeleccionarArchivo: (file: File) => void;
  onPrevisualizar: () => void;
  onVolver: () => void;
  onConfirmar: () => void;
  onDescargarErrores: () => void;
}

/** Modal reutilizable de importación masiva — sin llamar servicios directamente, solo notifica por props (T-412). */
export function ModalImportarExcel({
  abierto, tipo, estado, archivo, preview, lote, error, resumen, puedeConfirmar,
  onCerrar, onDescargarPlantilla, onSeleccionarArchivo, onPrevisualizar, onVolver, onConfirmar, onDescargarErrores,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (!abierto) return null;

  const enPaso1 = estado === "INACTIVO" || estado === "ARCHIVO_SELECCIONADO";
  const enPaso2 = estado === "PREVISUALIZANDO" || estado === "PREVISUALIZADO";
  const enPaso3 = estado === "CONFIRMANDO" || estado === "COMPLETADO";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-dark/40" aria-hidden="true" onClick={onCerrar} />

      <div className={cn("relative z-10 mx-4 w-full max-w-[520px]", "rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card", "p-6")}>
        <h2 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">{TITULO_POR_TIPO[tipo]}</h2>

        {error && <p className="mb-4 rounded-lg bg-red-light/[0.08] px-4 py-3 text-body-sm text-red">{error}</p>}

        {enPaso1 && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-body-sm text-dark-4 dark:text-dark-6">1. Descarga la plantilla y complétala.</p>
              <button type="button" onClick={onDescargarPlantilla} className="text-sm font-medium text-primary hover:underline">
                ⬇ Descargar plantilla
              </button>
            </div>
            <div>
              <p className="mb-2 text-body-sm text-dark-4 dark:text-dark-6">2. Sube el archivo completo (.xlsx).</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onSeleccionarArchivo(f); }}
                className="w-full rounded-lg border border-stroke px-3 py-2 text-sm focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              />
              {archivo && <p className="mt-1 text-body-xs text-dark-4 dark:text-dark-6">{archivo.name}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <Boton variante="secundario" onClick={onCerrar} className="w-auto px-6">Cancelar</Boton>
              <Boton onClick={onPrevisualizar} disabled={!archivo} className="w-auto px-6">Previsualizar →</Boton>
            </div>
          </div>
        )}

        {enPaso2 && (
          <div className="space-y-4">
            {estado === "PREVISUALIZANDO" ? (
              <p className="text-body-sm text-dark-4 dark:text-dark-6">Analizando archivo...</p>
            ) : (
              <>
                <p className="text-body-sm text-dark dark:text-white">✓ {resumen?.filasValidas} filas listas para importar</p>
                {resumen && resumen.filasConError > 0 && (
                  <div>
                    <p className="mb-2 text-body-sm text-dark dark:text-white">⚠ {resumen.filasConError} filas con error</p>
                    <div className="max-h-40 space-y-1.5 overflow-y-auto">
                      {preview?.filasConError.map((f) => (
                        <p key={f.fila} className="rounded-md bg-red-light/[0.08] px-3 py-1.5 text-body-sm text-red">
                          Fila {f.fila} — {f.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <Boton variante="secundario" onClick={onVolver} className="w-auto px-6">← Volver</Boton>
                  <Boton onClick={onConfirmar} disabled={!puedeConfirmar} className="w-auto px-6">Confirmar importación</Boton>
                </div>
              </>
            )}
          </div>
        )}

        {enPaso3 && (
          <div className="space-y-4">
            {estado === "CONFIRMANDO" ? (
              <p className="text-body-sm text-dark-4 dark:text-dark-6">Importando...</p>
            ) : (
              <>
                <p className="text-body-sm text-dark dark:text-white">✓ Se importaron {lote?.filasExitosas} {tipo === "CLIENTE" ? "clientes" : "sucursales"} correctamente.</p>
                {lote && lote.filasConError > 0 && (
                  <p className="text-body-sm text-dark dark:text-white">⚠ {lote.filasConError} filas no se pudieron importar.</p>
                )}
                <div className="flex justify-end gap-3">
                  {lote && lote.filasConError > 0 && (
                    <button type="button" onClick={onDescargarErrores} className="text-sm font-medium text-primary hover:underline">
                      ⬇ Descargar detalle de errores
                    </button>
                  )}
                  <Boton onClick={onCerrar} className="w-auto px-6">Cerrar</Boton>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
