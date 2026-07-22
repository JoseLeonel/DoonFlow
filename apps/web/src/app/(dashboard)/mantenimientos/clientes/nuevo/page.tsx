"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormularioCliente } from "../_components/formulario-cliente";
import { crearCliente } from "../_servicios/cliente.servicio";
import type { DatosGuardarCliente } from "../_servicios/cliente.servicio";

export default function PaginaNuevoCliente() {
  const router    = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const handleGuardar = async (datos: DatosGuardarCliente) => {
    setGuardando(true);
    setError(null);
    try {
      await crearCliente(datos);
      router.push("/mantenimientos/clientes");
    } catch (e: any) {
      setError(e.message ?? "Error al guardar el cliente.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/mantenimientos" className="hover:text-primary">Mantenimientos</Link>
        <span className="mx-1.5">/</span>
        <Link href="/mantenimientos/clientes" className="hover:text-primary">Clientes</Link>
        <span className="mx-1.5">/</span>
        <span>Nuevo cliente</span>
      </nav>
      <h1 className="mb-6 text-heading-6 font-bold text-dark dark:text-white">Nuevo cliente</h1>

      <FormularioCliente
        guardando={guardando}
        error={error}
        onGuardar={handleGuardar}
        onCancelar={() => router.push("/mantenimientos/clientes")}
      />
    </div>
  );
}
