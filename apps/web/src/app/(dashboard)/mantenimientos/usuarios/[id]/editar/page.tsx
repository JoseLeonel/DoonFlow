"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@doonflow/shared";
import { FormularioUsuario } from "../../_components/formulario-usuario";
import { obtenerUsuario, actualizarUsuario, listarRoles } from "../../_servicios/usuario.servicio";
import { listarClientes } from "../../../clientes/_servicios/cliente.servicio";
import type { DatosGuardarUsuario, RolCatalogo, UsuarioConAlcance } from "../../_servicios/usuario.servicio";
import type { Cliente } from "../../../clientes/_servicios/cliente.servicio";

export default function PaginaEditarUsuario({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [usuario,   setUsuario]   = useState<UsuarioConAlcance | null>(null);
  const [roles,     setRoles]     = useState<RolCatalogo[]>([]);
  const [clientes,  setClientes]  = useState<Cliente[]>([]);
  const [cargando,  setCargando]  = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [exito,     setExito]     = useState(false);

  useEffect(() => {
    Promise.all([obtenerUsuario(params.id), listarRoles(), listarClientes(1, 1000)])
      .then(([u, r, c]) => { setUsuario(u); setRoles(r); setClientes(c.items); })
      .catch(() => setError("Usuario no encontrado."))
      .finally(() => setCargando(false));
  }, [params.id]);

  const handleGuardar = async (datos: DatosGuardarUsuario) => {
    setGuardando(true);
    setError(null);
    setExito(false);
    try {
      const actualizado = await actualizarUsuario(params.id, datos);
      setUsuario(actualizado);
      setExito(true);
    } catch (e: any) {
      setError(e.message ?? "Error al actualizar el usuario.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="p-6 md:p-7.5">
        <div className="mb-8 h-6 w-64 animate-pulse rounded bg-gray-2 dark:bg-dark-3" />
        <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-8 space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 w-32 animate-pulse rounded bg-gray-2 dark:bg-dark-3" />
              <div className="h-10 animate-pulse rounded-lg bg-gray-2 dark:bg-dark-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !usuario) {
    return (
      <div className="p-6 md:p-7.5">
        <div className="rounded-[10px] border border-red-light bg-red-light/[0.06] p-8 text-center">
          <p className="text-sm font-medium text-red">{error}</p>
          <Link href="/mantenimientos/usuarios" className="mt-3 inline-block text-sm text-primary underline">
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/mantenimientos" className="hover:text-primary">Mantenimientos</Link>
        <span className="mx-1.5">/</span>
        <Link href="/mantenimientos/usuarios" className="hover:text-primary">Usuarios</Link>
        <span className="mx-1.5">/</span>
        <span>{usuario?.nombre}</span>
      </nav>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-heading-6 font-bold text-dark dark:text-white">{usuario?.nombre}</h1>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-body-xs font-medium",
            usuario?.activo
              ? "bg-green-light/[0.08] text-green dark:bg-green/10"
              : "bg-gray-2 text-dark-4 dark:bg-dark-3 dark:text-dark-6",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", usuario?.activo ? "bg-green" : "bg-dark-4 dark:bg-dark-6")} />
          {usuario?.activo ? "Activo" : "Inactivo"}
        </span>
      </div>

      {exito && (
        <div className="mb-5 rounded-lg border border-green/30 bg-green/[0.06] px-4 py-3 text-sm text-green">
          Los cambios se guardaron correctamente.
        </div>
      )}

      {usuario && (
        <FormularioUsuario
          modo="editar"
          roles={roles}
          clientes={clientes}
          valoresIniciales={{
            nombre: usuario.nombre,
            email: usuario.email,
            rolId: usuario.rolId,
            clienteId: usuario.clienteId ?? null,
            sucursalId: usuario.sucursalId ?? null,
            sucursalesAdicionalesIds: usuario.sucursalesAdicionales.map((s) => s.id),
          }}
          guardando={guardando}
          error={error}
          onGuardar={handleGuardar}
          onCancelar={() => router.push("/mantenimientos/usuarios")}
        />
      )}
    </div>
  );
}
