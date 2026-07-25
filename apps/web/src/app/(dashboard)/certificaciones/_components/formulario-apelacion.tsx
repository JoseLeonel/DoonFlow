"use client";

import { useState } from "react";
import type { Hallazgo, TipoApelacion } from "@doonflow/shared";

interface PropsFormularioApelacion {
  hallazgosActivos: Hallazgo[];
  diasRestantes: { dias: number; fechaLimite: Date } | null;
  plazoVencido: boolean;
  guardando: boolean;
  error: string | null;
  onEnviar: (datos: { tipo: TipoApelacion; hallazgoId?: string; motivo: string }) => void;
  onCancelar: () => void;
}

const MOTIVO_MIN = 10;

export function FormularioApelacion({
  hallazgosActivos, diasRestantes, plazoVencido, guardando, error, onEnviar, onCancelar,
}: PropsFormularioApelacion) {
  const [tipo, setTipo] = useState<TipoApelacion>("SOBRE_RESULTADO");
  const [hallazgoId, setHallazgoId] = useState(hallazgosActivos[0]?.id ?? "");
  const [motivo, setMotivo] = useState("");

  const motivoValido = motivo.trim().length >= MOTIVO_MIN;
  const puedeEnviar = motivoValido && (tipo === "SOBRE_RESULTADO" || !!hallazgoId);

  const enviar = () => {
    if (!puedeEnviar) return;
    onEnviar({ tipo, hallazgoId: tipo === "SOBRE_HALLAZGO" ? hallazgoId : undefined, motivo: motivo.trim() });
  };

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
      {plazoVencido ? (
        <p className="mb-4 text-body-sm text-red">
          El plazo para apelar esta certificación venció el {diasRestantes?.fechaLimite.toLocaleDateString("es-CR")}.
        </p>
      ) : (
        diasRestantes && (
          <p className="mb-4 text-body-sm text-dark-4 dark:text-dark-6">
            Plazo restante: {diasRestantes.dias} días (vence {diasRestantes.fechaLimite.toLocaleDateString("es-CR")})
          </p>
        )
      )}

      <label className="mb-2 block text-body-sm font-medium text-dark dark:text-white">¿Sobre qué apelas? *</label>
      <div className="mb-4 flex gap-6">
        <label className="flex items-center gap-2 text-sm text-dark dark:text-white">
          <input
            type="radio"
            name="tipo-apelacion"
            checked={tipo === "SOBRE_HALLAZGO"}
            onChange={() => setTipo("SOBRE_HALLAZGO")}
            disabled={hallazgosActivos.length === 0}
          />
          Un hallazgo específico
        </label>
        <label className="flex items-center gap-2 text-sm text-dark dark:text-white">
          <input
            type="radio"
            name="tipo-apelacion"
            checked={tipo === "SOBRE_RESULTADO"}
            onChange={() => setTipo("SOBRE_RESULTADO")}
          />
          El resultado general
        </label>
      </div>

      {tipo === "SOBRE_HALLAZGO" && (
        <div className="mb-4">
          <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Hallazgo *</label>
          <select
            value={hallazgoId}
            onChange={(e) => setHallazgoId(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
          >
            {hallazgosActivos.map((h) => (
              <option key={h.id} value={h.id}>{h.descripcion} — {h.severidad}</option>
            ))}
          </select>
        </div>
      )}

      <label className="mb-1.5 block text-body-sm font-medium text-dark dark:text-white">Motivo *</label>
      <textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
      />
      <p className="mb-4 mt-1 text-body-xs text-dark-4 dark:text-dark-6">Mínimo {MOTIVO_MIN} caracteres.</p>

      {error && <p className="mb-4 text-body-xs text-red">{error}</p>}

      {!plazoVencido && (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg border border-stroke px-6 py-2.5 text-sm font-medium text-dark hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!puedeEnviar || guardando}
            onClick={enviar}
            className="rounded-lg bg-primary px-8 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? "Enviando..." : "Enviar apelación"}
          </button>
        </div>
      )}
    </div>
  );
}
