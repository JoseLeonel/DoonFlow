"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listarClientes } from "../../mantenimientos/clientes/_servicios/cliente.servicio";
import type { Cliente } from "../../mantenimientos/clientes/_servicios/cliente.servicio";
import { listarSucursales, obtenerSucursal } from "../../mantenimientos/clientes/_servicios/sucursal.servicio";
import type { Sucursal } from "../../mantenimientos/clientes/_servicios/sucursal.servicio";
import { listarPlantillas } from "../../inspecciones/_servicios/inspeccion.servicio";
import { iniciarCertificacion } from "../_servicios/certificacion.servicio";

/**
 * Paso 0 del wizard: selector Cliente → Sucursal → Período (T-229).
 * Si llega desde /planificacion ("Iniciar ahora") trae `sucursalId`/`planId` por query string
 * (014-panel-calendario-biblioteca): se preselecciona el cliente dueño de esa sucursal y se
 * envía `planId` al iniciar para que el backend vincule el plan de auditoría a la certificación.
 */
export function useIniciarCertificacion() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sucursalIdPrecarga = searchParams.get("sucursalId");
  const planId = searchParams.get("planId") ?? undefined;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [plantillaId, setPlantillaId] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [fechaInicioPeriodo, setFechaInicioPeriodo] = useState("");
  const [fechaFinPeriodo, setFechaFinPeriodo] = useState("");

  const [cargando, setCargando] = useState(true);
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seleccionarCliente = useCallback((id: string, sucursalAPreseleccionar?: string) => {
    setClienteId(id);
    setSucursalId(sucursalAPreseleccionar ?? "");
    setSucursales([]);
    if (!id) return;
    listarSucursales(id)
      .then((lista) => setSucursales(lista.filter((s) => s.activo)))
      .catch(() => setError("No se pudo cargar las sucursales del cliente."));
  }, []);

  useEffect(() => {
    Promise.all([listarClientes(1, 1000), listarPlantillas(true)])
      .then(async ([listaClientes, listaPlantillas]) => {
        setClientes(listaClientes.items);
        setPlantillaId(listaPlantillas.items[0]?.id ?? null);
        if (!listaPlantillas.items[0]) setError("No hay una plantilla de Ficha BPM activa. Actívela en Inspecciones antes de certificar.");
        if (sucursalIdPrecarga) {
          const sucursal = await obtenerSucursal(sucursalIdPrecarga).catch(() => null);
          if (sucursal) seleccionarCliente(sucursal.clienteId, sucursal.id);
        }
      })
      .catch(() => setError("No se pudo cargar la información inicial."))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const periodoValido = !!fechaInicioPeriodo && !!fechaFinPeriodo && fechaFinPeriodo > fechaInicioPeriodo;
  const puedeIniciar = !!plantillaId && !!clienteId && !!sucursalId && periodoValido && !iniciando;

  const iniciar = useCallback(async () => {
    if (!plantillaId || !sucursalId || !periodoValido) return;
    setIniciando(true);
    setError(null);
    try {
      const certificacion = await iniciarCertificacion({ plantillaId, sucursalId, fechaInicioPeriodo, fechaFinPeriodo, planId });
      router.push(`/certificaciones/${certificacion.id}/responder`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el formulario.");
      setIniciando(false);
    }
  }, [plantillaId, sucursalId, periodoValido, fechaInicioPeriodo, fechaFinPeriodo, planId, router]);

  return {
    clientes,
    sucursales,
    clienteId,
    sucursalId,
    fechaInicioPeriodo,
    fechaFinPeriodo,
    cargando,
    iniciando,
    error,
    puedeIniciar,
    seleccionarCliente,
    seleccionarSucursal: setSucursalId,
    setFechaInicioPeriodo,
    setFechaFinPeriodo,
    iniciar,
  };
}
