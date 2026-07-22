"use client";

import { useEffect, useState } from "react";
import { ROL_ADMINISTRADOR_CLIENTE, ROL_USUARIO_SUCURSAL } from "@doonflow/shared";
import { usarFormularioUsuario } from "../_hooks/usar-formulario-usuario";
import { obtenerSucursal } from "../../clientes/_servicios/sucursal.servicio";
import type { Cliente } from "../../clientes/_servicios/cliente.servicio";
import type { DatosGuardarUsuario, RolCatalogo } from "../_servicios/usuario.servicio";

interface ValoresIniciales {
  nombre: string;
  email: string;
  rolId: string;
  clienteId: string | null;
  sucursalId: string | null;
  sucursalesAdicionalesIds: string[];
}

interface PropsFormularioUsuario {
  modo: "crear" | "editar";
  roles: RolCatalogo[];
  clientes: Cliente[];
  valoresIniciales?: ValoresIniciales;
  guardando: boolean;
  error: string | null;
  onGuardar: (datos: DatosGuardarUsuario) => void;
  onCancelar: () => void;
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validación espejo de `validarPoliticaPassword` del backend (010-seguridad-privacidad-continuidad,
 * `apps/api/src/modules/auth/domain/politica-password.entity.ts`) — no reemplaza la del backend,
 * solo evita un viaje de red innecesario cuando la contraseña obviamente no cumple.
 */
function validarPoliticaPasswordCliente(password: string): string | null {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Z]/.test(password)) return "La contraseña debe tener al menos una mayúscula.";
  if (!/[0-9]/.test(password)) return "La contraseña debe tener al menos un número.";
  return null;
}

export function FormularioUsuario({
  modo,
  roles,
  clientes,
  valoresIniciales,
  guardando,
  error,
  onGuardar,
  onCancelar,
}: PropsFormularioUsuario) {
  const [nombre, setNombre] = useState(valoresIniciales?.nombre ?? "");
  const [email, setEmail] = useState(valoresIniciales?.email ?? "");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [clienteFiltroId, setClienteFiltroId] = useState<string | null>(null);

  const {
    rolId,
    clienteId,
    sucursalId,
    sucursalesAdicionalesIds,
    sucursalesDisponibles,
    cargandoSucursales,
    cambiarRol,
    seleccionarCliente,
    seleccionarClienteFiltro,
    setSucursalId,
    setSucursalesAdicionalesIds,
  } = usarFormularioUsuario();

  // Precarga en modo editar
  useEffect(() => {
    if (!valoresIniciales) return;
    cambiarRol(valoresIniciales.rolId);
    if (valoresIniciales.clienteId) {
      seleccionarCliente(valoresIniciales.clienteId);
    }
    if (valoresIniciales.sucursalId) {
      obtenerSucursal(valoresIniciales.sucursalId).then((sucursal) => {
        setClienteFiltroId(sucursal.clienteId);
        seleccionarClienteFiltro(sucursal.clienteId).then(() => {
          setSucursalId(valoresIniciales.sucursalId);
          setSucursalesAdicionalesIds(valoresIniciales.sucursalesAdicionalesIds);
        });
      });
    } else if (valoresIniciales.sucursalesAdicionalesIds.length > 0) {
      setSucursalesAdicionalesIds(valoresIniciales.sucursalesAdicionalesIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valoresIniciales]);

  const rolSeleccionado = roles.find((r) => r.id === rolId);
  const esAdministradorCliente = rolSeleccionado?.nombre === ROL_ADMINISTRADOR_CLIENTE;
  const esUsuarioSucursal = rolSeleccionado?.nombre === ROL_USUARIO_SUCURSAL;

  const validar = (): boolean => {
    const nuevos: Record<string, string> = {};
    if (!nombre.trim()) nuevos.nombre = "Campo requerido";
    if (!email.trim()) nuevos.email = "Campo requerido";
    else if (!RE_EMAIL.test(email)) nuevos.email = "Formato de correo inválido";
    if (modo === "crear") {
      const mensajePassword = validarPoliticaPasswordCliente(password);
      if (mensajePassword) nuevos.password = mensajePassword;
    }
    if (!rolId) nuevos.rolId = "Campo requerido";
    if (esAdministradorCliente && !clienteId) nuevos.clienteId = "Selecciona un cliente";
    if (esUsuarioSucursal && !sucursalId && sucursalesAdicionalesIds.length === 0) {
      nuevos.sucursalId = "Selecciona al menos una sucursal";
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    onGuardar({
      nombre: nombre.trim(),
      email: email.trim(),
      ...(modo === "crear" ? { password } : {}),
      rolId,
      clienteId: esAdministradorCliente ? clienteId : null,
      sucursalId: esUsuarioSucursal ? sucursalId : null,
      sucursalesAdicionalesIds: esUsuarioSucursal ? sucursalesAdicionalesIds : [],
    });
  };

  const toggleSucursalAdicional = (id: string) => {
    setSucursalesAdicionalesIds(
      sucursalesAdicionalesIds.includes(id)
        ? sucursalesAdicionalesIds.filter((s) => s !== id)
        : [...sucursalesAdicionalesIds, id],
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-6 md:p-8">
        <div className="grid gap-5">
          <Campo label="Nombre" requerido error={errores.nombre}>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Carlos Mora" className={inputCls(!!errores.nombre)} />
          </Campo>

          <Campo label="Correo" requerido error={errores.email}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="carlos@dist.com" className={inputCls(!!errores.email)} />
          </Campo>

          {modo === "crear" && (
            <Campo label="Contraseña" requerido error={errores.password}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls(!!errores.password)} />
              <p className="mt-1 text-body-xs text-dark-4 dark:text-dark-6">
                La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.
              </p>
            </Campo>
          )}
          {modo === "editar" && (
            <p className="text-body-xs text-dark-4 dark:text-dark-6">
              El restablecimiento de contraseña se gestiona en un sprint futuro.
            </p>
          )}

          <Campo label="Rol" requerido error={errores.rolId}>
            <select value={rolId} onChange={(e) => cambiarRol(e.target.value)} className={selectCls(!!errores.rolId)}>
              <option value="">Seleccionar rol...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{ETIQUETA_ROL[r.nombre] ?? r.nombre}</option>
              ))}
            </select>
          </Campo>

          {esAdministradorCliente && (
            <Campo label="Cliente" requerido error={errores.clienteId}>
              <select
                value={clienteId ?? ""}
                onChange={(e) => seleccionarCliente(e.target.value || null)}
                className={selectCls(!!errores.clienteId)}
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.empresa}</option>
                ))}
              </select>
            </Campo>
          )}

          {esUsuarioSucursal && (
            <>
              <Campo label="Cliente (para filtrar)" error={undefined}>
                <select
                  value={clienteFiltroId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value || null;
                    setClienteFiltroId(v);
                    seleccionarClienteFiltro(v);
                  }}
                  className={selectCls(false)}
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.empresa}</option>
                  ))}
                </select>
              </Campo>

              <Campo label="Sucursal principal" error={errores.sucursalId}>
                <select
                  value={sucursalId ?? ""}
                  onChange={(e) => setSucursalId(e.target.value || null)}
                  disabled={cargandoSucursales || sucursalesDisponibles.length === 0}
                  className={selectCls(!!errores.sucursalId)}
                >
                  <option value="">Seleccionar sucursal...</option>
                  {sucursalesDisponibles.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </Campo>

              {sucursalesDisponibles.length > 0 && (
                <div>
                  <p className="mb-2 text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">
                    Sucursales adicionales con acceso de consulta
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {sucursalesDisponibles.filter((s) => s.id !== sucursalId).map((s) => (
                      <label key={s.id} className="flex items-center gap-1.5 text-sm text-dark dark:text-white">
                        <input
                          type="checkbox"
                          checked={sucursalesAdicionalesIds.includes(s.id)}
                          onChange={() => toggleSucursalAdicional(s.id)}
                        />
                        {s.nombre}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
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
            {guardando && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
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

const ETIQUETA_ROL: Record<string, string> = {
  administrador: "Administrador general",
  administrador_cliente: "Administrador de cliente",
  usuario_sucursal: "Usuario de sucursal",
  productor: "Productor",
  operario: "Operario",
  auditor: "Auditor",
  cliente_externo: "Cliente externo",
};

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

function selectCls(conError: boolean) {
  return inputCls(conError);
}
