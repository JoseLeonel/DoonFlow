"use client";

import Link from "next/link";
import { useState } from "react";
import { Paginador } from "@doonflow/ui";
import { TablaClientes } from "./_components/tabla-clientes";
import { useClientes } from "./_hooks/use-clientes";
import { useImportacionExcel } from "../../_hooks-compartidos/use-importacion-excel";
import { ModalImportarExcel } from "../../_components-compartidos/modal-importar-excel";

export default function PaginaClientes() {
  const { clientes, total, pagina, porPagina, cargando, error, recargar, cambiarPagina, cambiarPorPagina } = useClientes();
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false);
  const importacion = useImportacionExcel("CLIENTE");

  function cerrarModalImportar() {
    setModalImportarAbierto(false);
    importacion.reiniciar();
    recargar();
  }

  return (
    <div className="p-6 md:p-7.5">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
            <Link href="/mantenimientos" className="hover:text-primary">Mantenimientos</Link>
            <span className="mx-1.5">/</span>
            <span>Clientes</span>
          </nav>
          <h1 className="text-heading-6 font-bold text-dark dark:text-white">Clientes</h1>
          <p className="mt-1 text-body-sm text-dark-4 dark:text-dark-6">
            Personas de contacto y empresas registradas
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setModalImportarAbierto(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-stroke px-5 py-2.5 text-sm font-medium text-dark hover:bg-gray-1 transition-colors dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
          >
            Importar desde Excel
          </button>
          <Link
            href="/mantenimientos/clientes/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar cliente
          </Link>
        </div>
      </div>

      <ModalImportarExcel
        abierto={modalImportarAbierto}
        tipo="CLIENTE"
        estado={importacion.estado}
        archivo={importacion.archivo}
        preview={importacion.preview}
        lote={importacion.lote}
        error={importacion.error}
        resumen={importacion.resumen}
        puedeConfirmar={importacion.puedeConfirmar}
        onCerrar={cerrarModalImportar}
        onDescargarPlantilla={importacion.descargarPlantilla}
        onSeleccionarArchivo={importacion.seleccionarArchivo}
        onPrevisualizar={importacion.previsualizar}
        onVolver={importacion.reiniciar}
        onConfirmar={importacion.confirmar}
        onDescargarErrores={importacion.descargarErrores}
      />

      {error ? (
        <div className="rounded-[10px] border border-red-light bg-red-light/[0.06] p-6 text-center text-sm text-red">
          {error}
          <button onClick={recargar} className="ml-3 underline">Reintentar</button>
        </div>
      ) : (
        <>
          <TablaClientes clientes={clientes} cargando={cargando} />
          {!cargando && total > 0 && (
            <Paginador
              pagina={pagina}
              porPagina={porPagina}
              total={total}
              onCambiarPagina={cambiarPagina}
              onCambiarPorPagina={cambiarPorPagina}
            />
          )}
        </>
      )}
    </div>
  );
}
