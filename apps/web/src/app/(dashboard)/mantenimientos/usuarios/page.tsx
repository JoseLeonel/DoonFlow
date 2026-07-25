"use client";

import Link from "next/link";
import { useUsuarios } from "./_hooks/use-usuarios";
import { TablaUsuarios } from "./_components/tabla-usuarios";

export default function PaginaUsuarios() {
  const { usuarios, cargando } = useUsuarios();

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/mantenimientos" className="hover:text-primary">Mantenimientos</Link>
        <span className="mx-1.5">/</span>
        <span>Usuarios</span>
      </nav>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-heading-6 font-bold text-dark dark:text-white">Usuarios</h1>
          <p className="text-body-sm text-dark-4 dark:text-dark-6">Cuentas de acceso y su alcance de visibilidad</p>
        </div>
        <Link
          href="/mantenimientos/usuarios/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 transition-colors"
        >
          <span className="text-base leading-none">+</span> Agregar usuario
        </Link>
      </div>

      <TablaUsuarios usuarios={usuarios} cargando={cargando} />
    </div>
  );
}
