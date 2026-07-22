"use client";

import { useState } from "react";
import type { DatosGuardarSucursal } from "../_servicios/sucursal.servicio";

interface ValoresFormulario {
  nombre: string;
  direccion: string;
  correo: string;
  movil: string;
}

interface PropsFormularioSucursal {
  valoresIniciales?: Partial<ValoresFormulario>;
  guardando: boolean;
  error: string | null;
  onGuardar: (datos: Omit<DatosGuardarSucursal, "clienteId">) => void;
  onCancelar: () => void;
}

const VACIO: ValoresFormulario = {
  nombre: "",
  direccion: "",
  correo: "",
  movil: "",
};

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FormularioSucursal({
  valoresIniciales,
  guardando,
  error,
  onGuardar,
  onCancelar,
}: PropsFormularioSucursal) {
  const [form, setForm] = useState<ValoresFormulario>({ ...VACIO, ...valoresIniciales });
  const [errores, setErrores] = useState<Partial<Record<keyof ValoresFormulario, string>>>({});

  const set = (campo: keyof ValoresFormulario) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const validar = (): boolean => {
    const nuevos: typeof errores = {};
    if (!form.nombre.trim()) nuevos.nombre = "Campo requerido";
    if (form.correo && !RE_EMAIL.test(form.correo)) nuevos.correo = "Formato de correo inválido";
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    onGuardar({
      nombre:    form.nombre.trim(),
      direccion: form.direccion.trim() || null,
      correo:    form.correo.trim() || null,
      movil:     form.movil.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-dark/40" onClick={onCancelar}>
      <form
        onSubmit={handleSubmit}
        noValidate
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-y-auto bg-white shadow-7 dark:bg-gray-dark"
      >
        <div className="flex items-center justify-between border-b border-stroke px-6 py-5 dark:border-dark-3">
          <h2 className="text-heading-6 font-bold text-dark dark:text-white">
            {valoresIniciales ? "Modificar sucursal" : "Nueva sucursal"}
          </h2>
          <button
            type="button"
            onClick={onCancelar}
            className="text-dark-4 hover:text-dark dark:text-dark-6 dark:hover:text-white"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="grid gap-5 p-6">
          <Campo label="Nombre" requerido error={errores.nombre}>
            <input
              type="text"
              value={form.nombre}
              onChange={set("nombre")}
              placeholder="Planta Central"
              className={inputCls(!!errores.nombre)}
            />
          </Campo>

          <Campo label="Dirección" error={errores.direccion}>
            <input
              type="text"
              value={form.direccion}
              onChange={set("direccion")}
              placeholder="San José, Costa Rica"
              className={inputCls(!!errores.direccion)}
            />
          </Campo>

          <Campo label="Correo" error={errores.correo}>
            <input
              type="email"
              value={form.correo}
              onChange={set("correo")}
              placeholder="pc@distsur.com"
              className={inputCls(!!errores.correo)}
            />
          </Campo>

          <Campo label="Móvil" error={errores.movil}>
            <input
              type="text"
              value={form.movil}
              onChange={set("movil")}
              placeholder="8888-0001"
              className={inputCls(!!errores.movil)}
            />
          </Campo>
        </div>

        {error && (
          <div className="mx-6 mb-5 rounded-lg border border-red-light bg-red-light/[0.06] px-4 py-3 text-sm text-red">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-stroke px-6 py-5 dark:border-dark-3">
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60 transition-colors"
          >
            {guardando && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            Guardar
          </button>
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg border border-stroke px-6 py-2.5 text-sm font-medium text-dark-4 hover:bg-gray-1 dark:border-dark-3 dark:text-dark-6 dark:hover:bg-dark-2 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function Campo({
  label, requerido, error, children,
}: {
  label: string; requerido?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">
        {label}{requerido && <span className="ml-0.5 text-red">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-body-xs text-red">{error}</p>}
    </div>
  );
}

function inputCls(conError: boolean) {
  return [
    "w-full rounded-lg border px-3 py-2.5 text-sm text-dark outline-none transition-colors",
    "dark:bg-dark-2 dark:text-white",
    "placeholder:text-dark-6 dark:placeholder:text-dark-6",
    conError
      ? "border-red focus:border-red"
      : "border-stroke focus:border-primary dark:border-dark-3 dark:focus:border-primary",
  ].join(" ");
}
