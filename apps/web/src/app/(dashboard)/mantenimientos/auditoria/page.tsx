"use client";

import Link from "next/link";
import { Paginador } from "@doonflow/ui";
import { usarAuditoria } from "./_hooks/usar-auditoria";
import { TablaAuditoria } from "./_components/tabla-auditoria";

export default function PaginaAuditoria() {
  const { registros, total, pagina, porPagina, filtros, cargando, error, aplicarFiltros, cambiarPagina, cambiarPorPagina } = usarAuditoria();

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/mantenimientos" className="hover:text-primary">Mantenimientos</Link>
        <span className="mx-1.5">/</span>
        <span>Auditoría</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-heading-6 font-bold text-dark dark:text-white">Auditoría</h1>
        <p className="text-body-sm text-dark-4 dark:text-dark-6">Registro histórico de acciones críticas del sistema (solo lectura)</p>
      </div>

      {error && <p className="mb-4 text-body-sm text-red">{error}</p>}

      <TablaAuditoria registros={registros} cargando={cargando} filtros={filtros} onAplicarFiltros={aplicarFiltros} />

      {!cargando && total > 0 && (
        <Paginador pagina={pagina} porPagina={porPagina} total={total} onCambiarPagina={cambiarPagina} onCambiarPorPagina={cambiarPorPagina} />
      )}
    </div>
  );
}
