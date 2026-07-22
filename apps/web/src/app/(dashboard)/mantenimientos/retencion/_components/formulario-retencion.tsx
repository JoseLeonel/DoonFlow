"use client";

import { Boton } from "@doonflow/ui";
import type { AccionAlVencer, PoliticaRetencion, TipoDatoRetencion } from "../_servicios/retencion.servicio";

const ETIQUETA_TIPO: Record<TipoDatoRetencion, string> = {
  EVIDENCIA: "Evidencia de certificación",
  PDF_CERTIFICACION: "PDF de certificación",
  DATO_PERSONAL_CONTACTO: "Datos personales de contacto",
};

interface Props {
  politicas: PoliticaRetencion[];
  cambios: Map<TipoDatoRetencion, { mesesRetencion: number; accionAlVencer: AccionAlVencer }>;
  guardando: boolean;
  hayCambiosPendientes: boolean;
  onEditar: (tipoDato: TipoDatoRetencion, campo: "mesesRetencion" | "accionAlVencer", valor: number | AccionAlVencer) => void;
  onGuardar: () => void;
}

/** Formulario de 3 filas fijas (una por `TipoDatoRetencion`) — guardado explícito, sin autoguardado. */
export function FormularioRetencion({ politicas, cambios, guardando, hayCambiosPendientes, onEditar, onGuardar }: Props) {
  return (
    <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="space-y-4">
        {politicas.map((politica) => {
          const editado = cambios.get(politica.tipoDato);
          const mesesRetencion = editado?.mesesRetencion ?? politica.mesesRetencion;
          const accionAlVencer = editado?.accionAlVencer ?? politica.accionAlVencer;

          return (
            <div key={politica.tipoDato} className="flex flex-wrap items-end gap-4 border-b border-stroke pb-4 last:border-0 dark:border-dark-3">
              <div className="min-w-[220px] flex-1">
                <p className="font-medium text-dark dark:text-white">{ETIQUETA_TIPO[politica.tipoDato]}</p>
              </div>
              <div>
                <label className="mb-1 block text-body-xs text-dark-4 dark:text-dark-6">Meses de retención</label>
                <input
                  type="number"
                  min={1}
                  value={mesesRetencion}
                  onChange={(e) => onEditar(politica.tipoDato, "mesesRetencion", Number(e.target.value))}
                  className="w-28 rounded-lg border border-stroke bg-white px-3 py-1.5 text-body-sm text-dark outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-body-xs text-dark-4 dark:text-dark-6">Acción al vencer</label>
                <select
                  value={accionAlVencer}
                  onChange={(e) => onEditar(politica.tipoDato, "accionAlVencer", e.target.value as AccionAlVencer)}
                  className="rounded-lg border border-stroke bg-white px-3 py-1.5 text-body-sm text-dark outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                >
                  <option value="ANONIMIZAR">Anonimizar</option>
                  <option value="ELIMINAR">Eliminar</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <Boton
          type="button"
          onClick={onGuardar}
          disabled={!hayCambiosPendientes || guardando}
          cargando={guardando}
          className="w-auto px-6"
        >
          Guardar cambios
        </Boton>
      </div>
    </div>
  );
}
