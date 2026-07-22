"use client";

import { useState } from "react";
import type { DatosGuardarCliente } from "../_servicios/cliente.servicio";

interface ValoresFormulario {
  nombreResponsable: string;
  empresa: string;
  identificacionEmpresa: string;
  correo1: string;
  correo2: string;
  correo3: string;
  direccion: string;
  movil: string;
}

interface PropsFormularioCliente {
  valoresIniciales?: Partial<ValoresFormulario>;
  guardando: boolean;
  error: string | null;
  onGuardar: (datos: DatosGuardarCliente) => void;
  onCancelar: () => void;
}

const VACIO: ValoresFormulario = {
  nombreResponsable: "",
  empresa: "",
  identificacionEmpresa: "",
  correo1: "",
  correo2: "",
  correo3: "",
  direccion: "",
  movil: "",
};

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FormularioCliente({
  valoresIniciales,
  guardando,
  error,
  onGuardar,
  onCancelar,
}: PropsFormularioCliente) {
  const [form, setForm] = useState<ValoresFormulario>({ ...VACIO, ...valoresIniciales });
  const [errores, setErrores] = useState<Partial<Record<keyof ValoresFormulario, string>>>({});

  const set = (campo: keyof ValoresFormulario) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const validar = (): boolean => {
    const nuevos: typeof errores = {};
    if (!form.nombreResponsable.trim()) nuevos.nombreResponsable = "Campo requerido";
    if (!form.empresa.trim())           nuevos.empresa = "Campo requerido";
    if (!form.correo1.trim())           nuevos.correo1 = "Campo requerido";
    else if (!RE_EMAIL.test(form.correo1)) nuevos.correo1 = "Formato de correo inválido";
    if (form.correo2 && !RE_EMAIL.test(form.correo2)) nuevos.correo2 = "Formato de correo inválido";
    if (form.correo3 && !RE_EMAIL.test(form.correo3)) nuevos.correo3 = "Formato de correo inválido";
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    onGuardar({
      nombreResponsable:     form.nombreResponsable.trim(),
      empresa:               form.empresa.trim(),
      identificacionEmpresa: form.identificacionEmpresa.trim() || null,
      correo1:               form.correo1.trim(),
      correo2:               form.correo2.trim() || null,
      correo3:               form.correo3.trim() || null,
      direccion:             form.direccion.trim() || null,
      movil:                 form.movil.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-6 md:p-8">
        <div className="grid gap-5">

          <Campo label="Nombre completo (persona responsable)" requerido error={errores.nombreResponsable}>
            <input
              type="text"
              value={form.nombreResponsable}
              onChange={set("nombreResponsable")}
              placeholder="Juan Pérez García"
              className={inputCls(!!errores.nombreResponsable)}
            />
          </Campo>

          <Campo label="Empresa" requerido error={errores.empresa}>
            <input
              type="text"
              value={form.empresa}
              onChange={set("empresa")}
              placeholder="Distribuidora Sur S.A."
              className={inputCls(!!errores.empresa)}
            />
          </Campo>

          <Campo label="Identificación empresa" error={errores.identificacionEmpresa}>
            <input
              type="text"
              value={form.identificacionEmpresa}
              onChange={set("identificacionEmpresa")}
              placeholder="3-101-222333"
              className={inputCls(!!errores.identificacionEmpresa)}
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

          <Campo label="Móvil" error={errores.movil}>
            <input
              type="text"
              value={form.movil}
              onChange={set("movil")}
              placeholder="8888-0001"
              className={inputCls(!!errores.movil)}
            />
          </Campo>

          {/* Correos */}
          <div>
            <p className="mb-3 text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">
              Correos electrónicos
            </p>
            <div className="grid gap-3">
              <Campo label="Correo 1" requerido error={errores.correo1}>
                <input
                  type="email"
                  value={form.correo1}
                  onChange={set("correo1")}
                  placeholder="contacto@empresa.com"
                  className={inputCls(!!errores.correo1)}
                />
              </Campo>
              <Campo label="Correo 2" error={errores.correo2}>
                <input
                  type="email"
                  value={form.correo2}
                  onChange={set("correo2")}
                  placeholder="ventas@empresa.com"
                  className={inputCls(!!errores.correo2)}
                />
              </Campo>
              <Campo label="Correo 3" error={errores.correo3}>
                <input
                  type="email"
                  value={form.correo3}
                  onChange={set("correo3")}
                  placeholder="soporte@empresa.com"
                  className={inputCls(!!errores.correo3)}
                />
              </Campo>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-red-light bg-red-light/[0.06] px-4 py-3 text-sm text-red">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
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
      </div>
    </form>
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
