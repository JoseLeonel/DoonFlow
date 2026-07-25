"use client";

import { useEffect, useState } from "react";
import { obtenerHistoricoSucursal } from "../_servicios/sucursal.servicio";
import type { HistoricoSucursal } from "../_servicios/sucursal.servicio";

export function useHistoricoSucursal(sucursalId: string) {
  const [historico, setHistorico] = useState<HistoricoSucursal | null>(null);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!sucursalId) return;
    setCargando(true);
    setError(null);
    obtenerHistoricoSucursal(sucursalId)
      .then(setHistorico)
      .catch(() => setError("No se pudo cargar el histórico de certificaciones."))
      .finally(() => setCargando(false));
  }, [sucursalId]);

  return { historico, cargando, error };
}
