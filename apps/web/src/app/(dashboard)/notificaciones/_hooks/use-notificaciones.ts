"use client";

import { useCallback, useEffect, useState } from "react";
import {
  contarNoLeidas as contarNoLeidasServicio,
  listarNotificaciones,
  marcarLeida as marcarLeidaServicio,
  marcarTodasLeidas as marcarTodasLeidasServicio,
  type Notificacion,
} from "../_servicios/notificacion.servicio";

const INTERVALO_CONTADOR_MS = 60_000;

/** Centro de notificaciones del header: contador refrescado en intervalo, dropdown controlado. */
export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const refrescarContador = useCallback(() => {
    contarNoLeidasServicio()
      .then(({ total }) => setNoLeidas(total))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refrescarContador();
    const intervalo = setInterval(refrescarContador, INTERVALO_CONTADOR_MS);
    return () => clearInterval(intervalo);
  }, [refrescarContador]);

  const cargarNotificaciones = useCallback(() => {
    setCargando(true);
    listarNotificaciones()
      .then(setNotificaciones)
      .catch(() => undefined)
      .finally(() => setCargando(false));
  }, []);

  const toggle = useCallback(() => {
    setAbierto((actual) => {
      const nuevoValor = !actual;
      if (nuevoValor) cargarNotificaciones();
      return nuevoValor;
    });
  }, [cargarNotificaciones]);

  const marcarLeida = useCallback(async (id: string) => {
    setNotificaciones((actuales) => actuales.map((n) => (n.id === id ? { ...n, leidaEn: new Date().toISOString() } : n)));
    setNoLeidas((actual) => Math.max(0, actual - 1));
    try {
      await marcarLeidaServicio(id);
    } catch {
      refrescarContador();
    }
  }, [refrescarContador]);

  const marcarTodasLeidas = useCallback(async () => {
    setNotificaciones((actuales) => actuales.map((n) => ({ ...n, leidaEn: n.leidaEn ?? new Date().toISOString() })));
    setNoLeidas(0);
    try {
      await marcarTodasLeidasServicio();
    } catch {
      refrescarContador();
    }
  }, [refrescarContador]);

  return { notificaciones, noLeidas, cargando, abierto, toggle, marcarLeida, marcarTodasLeidas };
}
