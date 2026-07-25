"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@doonflow/shared";
import { FormularioCliente } from "../../_components/formulario-cliente";
import { SeccionSucursales } from "../../_components/seccion-sucursales";
import { obtenerCliente, actualizarCliente } from "../../_servicios/cliente.servicio";
import type { Cliente, DatosGuardarCliente } from "../../_servicios/cliente.servicio";

export default function PaginaEditarCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const soloLectura = useSearchParams().get("soloLectura") === "1";
  const [cliente,   setCliente]   = useState<Cliente | null>(null);
  const [cargando,  setCargando]  = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [exito,     setExito]     = useState(false);

  useEffect(() => {
    obtenerCliente(id)
      .then(setCliente)
      .catch(() => setError("Cliente no encontrado."))
      .finally(() => setCargando(false));
  }, [id]);

  const handleGuardar = async (datos: DatosGuardarCliente) => {
    setGuardando(true);
    setError(null);
    setExito(false);
    try {
      const actualizado = await actualizarCliente(id, datos);
      setCliente(actualizado);
      setExito(true);
    } catch (e: any) {
      setError(e.message ?? "Error al actualizar el cliente.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="p-6 md:p-7.5">
        <div className="mb-8 h-6 w-64 animate-pulse rounded bg-gray-2 dark:bg-dark-3" />
        <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-8 space-y-5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 w-32 animate-pulse rounded bg-gray-2 dark:bg-dark-3" />
              <div className="h-10 animate-pulse rounded-lg bg-gray-2 dark:bg-dark-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !cliente) {
    return (
      <div className="p-6 md:p-7.5">
        <div className="rounded-[10px] border border-red-light bg-red-light/[0.06] p-8 text-center">
          <p className="text-sm font-medium text-red">{error}</p>
          <Link href="/mantenimientos/clientes" className="mt-3 inline-block text-sm text-primary underline">
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
        <Link href="/mantenimientos/clientes" className="hover:text-primary">Clientes</Link>
        <span className="mx-1.5">/</span>
        <span>{cliente?.empresa}</span>
      </nav>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-heading-6 font-bold text-dark dark:text-white">{cliente?.empresa}</h1>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-body-xs font-medium",
            cliente?.activo
              ? "bg-green-light/[0.08] text-green dark:bg-green/10"
              : "bg-gray-2 text-dark-4 dark:bg-dark-3 dark:text-dark-6",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", cliente?.activo ? "bg-green" : "bg-dark-4 dark:bg-dark-6")} />
          {cliente?.activo ? "Activo" : "Inactivo"}
        </span>
      </div>

      {exito && (
        <div className="mb-5 rounded-lg border border-green/30 bg-green/[0.06] px-4 py-3 text-sm text-green">
          Los cambios se guardaron correctamente.
        </div>
      )}

      {soloLectura ? (
        <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-6 md:p-8">
          <dl className="grid gap-4 sm:grid-cols-2">
            <InfoCampo etiqueta="Nombre responsable" valor={cliente?.nombreResponsable} />
            <InfoCampo etiqueta="Identificación" valor={cliente?.identificacionEmpresa} />
            <InfoCampo etiqueta="Correo" valor={cliente?.correo1} />
            <InfoCampo etiqueta="Móvil" valor={cliente?.movil} />
            <InfoCampo etiqueta="Dirección" valor={cliente?.direccion} />
          </dl>
        </div>
      ) : (
        <FormularioCliente
          valoresIniciales={{
            nombreResponsable:    cliente?.nombreResponsable ?? "",
            empresa:              cliente?.empresa ?? "",
            identificacionEmpresa:cliente?.identificacionEmpresa ?? "",
            correo1:              cliente?.correo1 ?? "",
            correo2:              cliente?.correo2 ?? "",
            correo3:              cliente?.correo3 ?? "",
            direccion:            cliente?.direccion ?? "",
            movil:                cliente?.movil ?? "",
          }}
          guardando={guardando}
          error={error}
          onGuardar={handleGuardar}
          onCancelar={() => router.push("/mantenimientos/clientes")}
        />
      )}

      {cliente && <SeccionSucursales clienteId={cliente.id} soloLectura={soloLectura} />}
    </div>
  );
}

function InfoCampo({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">{etiqueta}</dt>
      <dd className="mt-1 text-sm text-dark dark:text-white">{valor ?? "—"}</dd>
    </div>
  );
}
