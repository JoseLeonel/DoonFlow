"use client";

import Link from "next/link";
import { Paginador } from "@doonflow/ui";
import { useCertificaciones } from "./_hooks/use-certificaciones";
import { TablaCertificaciones } from "./_components/tabla-certificaciones";

export default function PaginaCertificaciones() {
  const { certificaciones, total, pagina, porPagina, cargando, cambiarPagina, cambiarPorPagina } = useCertificaciones();

  return (
    <div className="p-6 md:p-7.5">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-heading-6 font-bold text-dark dark:text-white">Certificaciones</h1>
          <p className="text-body-sm text-dark-4 dark:text-dark-6">Formularios de certificación por sucursal y período</p>
        </div>
        <Link
          href="/certificaciones/nueva"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 transition-colors"
        >
          <span className="text-base leading-none">+</span> Nueva certificación
        </Link>
      </div>

      <TablaCertificaciones certificaciones={certificaciones} cargando={cargando} />
      {!cargando && total > 0 && (
        <Paginador
          pagina={pagina}
          porPagina={porPagina}
          total={total}
          onCambiarPagina={cambiarPagina}
          onCambiarPorPagina={cambiarPorPagina}
        />
      )}
    </div>
  );
}
