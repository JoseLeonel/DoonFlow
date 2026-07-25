"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerSesionActual } from "../../../../lib/sesion.servicio";
import {
  listarClientesParaFiltro,
  obtenerPanelEjecutivo,
  type ClienteParaFiltro,
  type PanelEjecutivo,
} from "../_servicios/panel-ejecutivo.servicio";

/** Panel ejecutivo (014-panel-calendario-biblioteca, HU-4): KPIs agregados, filtrables por cliente. */
export function usePanelEjecutivo() {
  const [panel, setPanel] = useState<PanelEjecutivo | null>(null);
  const [clientes, setClientes] = useState<ClienteParaFiltro[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");
  const [filtroClienteOculto, setFiltroClienteOculto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerSesionActual()
      .then((sesion) => {
        if (sesion.alcance.tipo === "CLIENTE") {
          setFiltroClienteOculto(true);
          setClienteSeleccionado(sesion.alcance.cliente.id);
        } else {
          listarClientesParaFiltro().then(setClientes).catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }, []);

  const cargar = useCallback((clienteId?: string) => {
    setCargando(true);
    setError(null);
    obtenerPanelEjecutivo(clienteId)
      .then(setPanel)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el panel ejecutivo."))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(clienteSeleccionado || undefined); }, [cargar, clienteSeleccionado]);

  return {
    panel, clientes, clienteSeleccionado, setClienteSeleccionado, filtroClienteOculto, cargando, error,
    recargar: () => cargar(clienteSeleccionado || undefined),
  };
}
