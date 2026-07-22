"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormularioUsuario } from "../_components/formulario-usuario";
import { crearUsuario, listarRoles } from "../_servicios/usuario.servicio";
import { listarClientes } from "../../clientes/_servicios/cliente.servicio";
import type { DatosGuardarUsuario, RolCatalogo } from "../_servicios/usuario.servicio";
import type { Cliente } from "../../clientes/_servicios/cliente.servicio";

export default function PaginaNuevoUsuario() {
  const router = useRouter();
  const [roles, setRoles] = useState<RolCatalogo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listarRoles(), listarClientes(1, 1000)])
      .then(([r, c]) => { setRoles(r); setClientes(c.items); })
      .finally(() => setCargando(false));
  }, []);

  const handleGuardar = async (datos: DatosGuardarUsuario) => {
    setGuardando(true);
    setError(null);
    try {
      await crearUsuario(datos);
      router.push("/mantenimientos/usuarios");
    } catch (e: any) {
      setError(e.message ?? "Error al crear el usuario.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/mantenimientos" className="hover:text-primary">Mantenimientos</Link>
        <span className="mx-1.5">/</span>
        <Link href="/mantenimientos/usuarios" className="hover:text-primary">Usuarios</Link>
        <span className="mx-1.5">/</span>
        <span>Nuevo usuario</span>
      </nav>

      <h1 className="mb-6 text-heading-6 font-bold text-dark dark:text-white">Nuevo usuario</h1>

      {!cargando && (
        <FormularioUsuario
          modo="crear"
          roles={roles}
          clientes={clientes}
          guardando={guardando}
          error={error}
          onGuardar={handleGuardar}
          onCancelar={() => router.push("/mantenimientos/usuarios")}
        />
      )}
    </div>
  );
}
