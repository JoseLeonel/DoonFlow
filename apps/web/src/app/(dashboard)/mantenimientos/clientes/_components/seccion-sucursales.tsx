"use client";

import { useState } from "react";
import { usarSucursales } from "../_hooks/usar-sucursales";
import { FormularioSucursal } from "./formulario-sucursal";
import { TablaSucursales } from "./tabla-sucursales";
import type { Sucursal } from "../_servicios/sucursal.servicio";
import { usarImportacionExcel } from "../../../_hooks-compartidos/usar-importacion-excel";
import { ModalImportarExcel } from "../../../_components-compartidos/modal-importar-excel";

export function SeccionSucursales({ clienteId, soloLectura = false }: { clienteId: string; soloLectura?: boolean }) {
  const { sucursales, cargando, guardando, error, crear, actualizar, toggleEstado, recargar } = usarSucursales(clienteId);
  const [editando, setEditando] = useState<Sucursal | null | undefined>(undefined);
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false);
  const importacion = usarImportacionExcel("SUCURSAL");

  function cerrarModalImportar() {
    setModalImportarAbierto(false);
    importacion.reiniciar();
    recargar();
  }

  const handleGuardar = async (datos: Omit<Parameters<typeof crear>[0], "clienteId">) => {
    if (editando) {
      await actualizar(editando.id, datos);
    } else {
      await crear(datos);
    }
    setEditando(undefined);
  };

  return (
    <div className="mt-6">
      {!soloLectura && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setModalImportarAbierto(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-1 transition-colors dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
          >
            Importar desde Excel
          </button>
        </div>
      )}

      <ModalImportarExcel
        abierto={modalImportarAbierto}
        tipo="SUCURSAL"
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

      <TablaSucursales
        clienteId={clienteId}
        sucursales={sucursales}
        cargando={cargando}
        onAgregar={() => setEditando(null)}
        onModificar={(s) => setEditando(s)}
        onToggleEstado={(s) => toggleEstado(s.id, !s.activo)}
        soloLectura={soloLectura}
      />

      {!soloLectura && editando !== undefined && (
        <FormularioSucursal
          valoresIniciales={
            editando
              ? {
                  nombre: editando.nombre,
                  direccion: editando.direccion ?? "",
                  correo: editando.correo ?? "",
                  movil: editando.movil ?? "",
                }
              : undefined
          }
          guardando={guardando}
          error={error}
          onGuardar={handleGuardar}
          onCancelar={() => setEditando(undefined)}
        />
      )}
    </div>
  );
}
