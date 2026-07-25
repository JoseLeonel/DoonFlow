"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Boton } from "@doonflow/ui";
import { obtenerSesionActual } from "../../../../../lib/sesion.servicio";
import { listarClientes } from "../../../mantenimientos/clientes/_servicios/cliente.servicio";
import { listarSucursales } from "../../../mantenimientos/clientes/_servicios/sucursal.servicio";
import { useGenerarReporte } from "../_hooks/use-generar-reporte";
import { FormularioGenerarReporte } from "../_components/formulario-generar-reporte";
import { VistaPreviaConsolidado } from "../_components/vista-previa-consolidado";
import { VistaPreviaComparativo } from "../_components/vista-previa-comparativo";

export default function PaginaNuevoReporte() {
  const hook = useGenerarReporte();

  const [clienteFijo, setClienteFijo] = useState<{ id: string; empresa: string } | null>(null);
  const [sinAcceso, setSinAcceso] = useState(false);
  const [clientes, setClientes] = useState<{ id: string; empresa: string }[]>([]);
  const [sucursalesDelCliente, setSucursalesDelCliente] = useState<{ id: string; nombre: string }[]>([]);
  const [cargandoContexto, setCargandoContexto] = useState(true);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  useEffect(() => {
    obtenerSesionActual()
      .then((sesion) => {
        if (sesion.alcance.tipo === "SUCURSAL") {
          setSinAcceso(true);
          return;
        }
        if (sesion.alcance.tipo === "CLIENTE") {
          const fijo = { id: sesion.alcance.cliente.id, empresa: sesion.alcance.cliente.empresa };
          setClienteFijo(fijo);
          hook.setClienteId(fijo.id);
        } else {
          listarClientes(1, 1000).then((r) => setClientes(r.items.map((c) => ({ id: c.id, empresa: c.empresa }))));
        }
      })
      .finally(() => setCargandoContexto(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hook.clienteId) { setSucursalesDelCliente([]); return; }
    listarSucursales(hook.clienteId).then((lista) => setSucursalesDelCliente(lista.map((s) => ({ id: s.id, nombre: s.nombre }))));
  }, [hook.clienteId]);

  async function manejarGenerarYDescargar() {
    const resultado = await hook.generar();
    if (resultado) {
      window.open(resultado.urlDescarga, "_blank");
      setMensajeExito("Reporte generado correctamente.");
    }
  }

  if (cargandoContexto) {
    return <div className="p-6 md:p-7.5"><p className="text-body-sm text-dark-4 dark:text-dark-6">Cargando...</p></div>;
  }

  if (sinAcceso) {
    return (
      <div className="p-6 md:p-7.5">
        <div className="rounded-[10px] bg-white p-12 text-center shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm text-dark-4 dark:text-dark-6">Tu rol no tiene acceso al módulo de reportes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-1 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/analytics" className="hover:text-primary">Analytics</Link>
        <span className="mx-1.5">/</span>
        <Link href="/analytics/reportes" className="hover:text-primary">Reportes</Link>
        <span className="mx-1.5">/</span>
        <span>Nuevo reporte</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-heading-6 font-bold text-dark dark:text-white">Generar reporte</h1>
        <p className="text-body-sm text-dark-4 dark:text-dark-6">Consolidado por cliente o comparativo entre sucursales, exportable a Excel o PDF</p>
      </div>

      <div className="space-y-6">
        <FormularioGenerarReporte
          tipo={hook.tipo} onTipoChange={hook.setTipo}
          clienteId={hook.clienteId} onClienteIdChange={hook.setClienteId}
          clientes={clientes} clienteFijo={clienteFijo}
          sucursalIds={hook.sucursalIds} onSucursalIdsChange={hook.setSucursalIds}
          sucursalesDelCliente={sucursalesDelCliente}
          fechaDesde={hook.fechaDesde} onFechaDesdeChange={hook.setFechaDesde}
          fechaHasta={hook.fechaHasta} onFechaHastaChange={hook.setFechaHasta}
          formato={hook.formato} onFormatoChange={hook.setFormato}
          generando={hook.previsualizando}
          onGenerar={hook.cargarPreview}
        />

        {hook.error && <p className="text-body-sm text-red">{hook.error}</p>}

        {hook.previewDesactualizado && (
          <p className="rounded-lg bg-yellow-light/[0.08] px-4 py-3 text-body-sm text-yellow-dark">
            Los filtros cambiaron, actualiza la vista previa.
          </p>
        )}

        {hook.datosPreview && !hook.previewDesactualizado && (
          <>
            {hook.tipo === "CONSOLIDADO_CLIENTE" ? (
              <VistaPreviaConsolidado datos={hook.datosPreview as any} cargando={false} error={null} onReintentar={hook.cargarPreview} />
            ) : (
              <VistaPreviaComparativo datos={hook.datosPreview as any} cargando={false} error={null} onReintentar={hook.cargarPreview} />
            )}

            {mensajeExito ? (
              <div className="rounded-lg bg-green-light/[0.08] px-4 py-3 text-body-sm text-green">
                {mensajeExito}{" "}
                <Link href="/analytics/reportes" className="font-medium underline">Ver en historial</Link>
              </div>
            ) : (
              <Boton type="button" onClick={manejarGenerarYDescargar} cargando={hook.generando} className="w-auto px-6">
                Generar y descargar
              </Boton>
            )}
          </>
        )}
      </div>
    </div>
  );
}
