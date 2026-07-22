"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listarClientes } from "../../mantenimientos/clientes/_servicios/cliente.servicio";
import type { Cliente } from "../../mantenimientos/clientes/_servicios/cliente.servicio";
import { listarSucursales } from "../../mantenimientos/clientes/_servicios/sucursal.servicio";
import type { Sucursal } from "../../mantenimientos/clientes/_servicios/sucursal.servicio";
import { listarPlantillas } from "../../inspecciones/_servicios/inspeccion.servicio";
import { iniciarCertificacion } from "../_servicios/certificacion.servicio";

/** Paso 0 del wizard: selector Cliente → Sucursal → Período (T-229). */
export function usarIniciarCertificacion() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [plantillaId, setPlantillaId] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [periodoEtiqueta, setPeriodoEtiqueta] = useState("");

  const [cargando, setCargando] = useState(true);
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listarClientes(1, 1000), listarPlantillas(true)])
      .then(([listaClientes, listaPlantillas]) => {
        setClientes(listaClientes.items);
        setPlantillaId(listaPlantillas.items[0]?.id ?? null);
        if (!listaPlantillas.items[0]) setError("No hay una plantilla de Ficha BPM activa. Actívela en Inspecciones antes de certificar.");
      })
      .catch(() => setError("No se pudo cargar la información inicial."))
      .finally(() => setCargando(false));
  }, []);

  const seleccionarCliente = useCallback((id: string) => {
    setClienteId(id);
    setSucursalId("");
    setSucursales([]);
    if (!id) return;
    listarSucursales(id)
      .then((lista) => setSucursales(lista.filter((s) => s.activo)))
      .catch(() => setError("No se pudo cargar las sucursales del cliente."));
  }, []);

  const puedeIniciar = !!plantillaId && !!clienteId && !!sucursalId && periodoEtiqueta.trim().length > 0 && !iniciando;

  const iniciar = useCallback(async () => {
    if (!plantillaId || !sucursalId) return;
    setIniciando(true);
    setError(null);
    try {
      const certificacion = await iniciarCertificacion({ plantillaId, sucursalId, periodoEtiqueta: periodoEtiqueta.trim() });
      router.push(`/certificaciones/${certificacion.id}/responder`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el formulario.");
      setIniciando(false);
    }
  }, [plantillaId, sucursalId, periodoEtiqueta, router]);

  return {
    clientes,
    sucursales,
    clienteId,
    sucursalId,
    periodoEtiqueta,
    cargando,
    iniciando,
    error,
    puedeIniciar,
    seleccionarCliente,
    seleccionarSucursal: setSucursalId,
    setPeriodoEtiqueta,
    iniciar,
  };
}
