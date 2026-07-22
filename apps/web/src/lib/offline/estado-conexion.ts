"use client";

import { useEffect, useState } from "react";

export type EstadoConexion = "online" | "offline";

const TIMEOUT_VERIFICACION_MS = 3000;
const INTERVALO_VERIFICACION_MS = 15000;

/**
 * `navigator.onLine` puede reportar "en línea" en redes rurales inestables sin conectividad
 * real hacia el servidor — se complementa con una verificación activa liviana (`HEAD /` al
 * propio origin, sin necesitar un endpoint nuevo ni autenticación) con timeout corto, en vez
 * de confiar únicamente en el evento del navegador.
 */
export function usarEstadoConexion(): EstadoConexion {
  const [estado, setEstado] = useState<EstadoConexion>(() =>
    typeof navigator === "undefined" || navigator.onLine ? "online" : "offline",
  );

  useEffect(() => {
    let cancelado = false;

    const verificar = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (!cancelado) setEstado("offline");
        return;
      }
      try {
        const controlador = new AbortController();
        const timeoutId = setTimeout(() => controlador.abort(), TIMEOUT_VERIFICACION_MS);
        await fetch("/", { method: "HEAD", cache: "no-store", signal: controlador.signal });
        clearTimeout(timeoutId);
        if (!cancelado) setEstado("online");
      } catch {
        if (!cancelado) setEstado("offline");
      }
    };

    verificar();
    const intervalo = setInterval(verificar, INTERVALO_VERIFICACION_MS);
    window.addEventListener("online", verificar);
    window.addEventListener("offline", verificar);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      window.removeEventListener("online", verificar);
      window.removeEventListener("offline", verificar);
    };
  }, []);

  return estado;
}
