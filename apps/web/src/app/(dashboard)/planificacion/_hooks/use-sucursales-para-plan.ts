"use client";

import { useEffect, useState } from "react";
import { listarSucursalesParaFiltro, type SucursalParaFiltro } from "../_servicios/plan-auditoria.servicio";

/** Lista de sucursales para el select del formulario de programación (014-panel-calendario-biblioteca). */
export function useSucursalesParaPlan() {
  const [sucursales, setSucursales] = useState<SucursalParaFiltro[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    listarSucursalesParaFiltro()
      .then(setSucursales)
      .finally(() => setCargando(false));
  }, []);

  return { sucursales, cargando };
}
