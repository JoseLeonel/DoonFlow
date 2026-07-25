"use client";

import { useCallback, useEffect, useState } from "react";
import { listarCertificaciones } from "../_servicios/certificacion.servicio";
import type { Certificacion } from "../_servicios/certificacion.servicio";

export function useCertificaciones() {
  const [certificaciones, setCertificaciones] = useState<Certificacion[]>([]);
  const [total,     setTotal]     = useState(0);
  const [pagina,    setPagina]    = useState(1);
  const [porPagina, setPorPagina] = useState(20);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { items, total } = await listarCertificaciones({ pagina, porPagina });
      setCertificaciones(items);
      setTotal(total);
    } catch {
      setError("No se pudo cargar la lista de certificaciones.");
    } finally {
      setCargando(false);
    }
  }, [pagina, porPagina]);

  useEffect(() => { recargar(); }, [recargar]);

  function cambiarPagina(nuevaPagina: number) {
    setPagina(nuevaPagina);
  }

  function cambiarPorPagina(nuevoPorPagina: number) {
    setPorPagina(nuevoPorPagina);
    setPagina(1);
  }

  return { certificaciones, total, pagina, porPagina, cargando, error, recargar, cambiarPagina, cambiarPorPagina };
}
