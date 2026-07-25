"use client";

import { useCallback, useEffect, useState } from "react";
import { crearApiKey, listarApiKeys, revocarApiKey, type ApiKey } from "../_servicios/api-key.servicio";

/** Estado y acciones de la gestión de API keys (009-integraciones-datos-masivos, HU-3). */
export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    listarApiKeys()
      .then(setApiKeys)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar las claves de API."))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = useCallback(async (nombre: string) => {
    const creada = await crearApiKey(nombre);
    setApiKeys((actuales) => [creada, ...actuales]);
    return creada;
  }, []);

  const revocar = useCallback(async (id: string) => {
    const actualizada = await revocarApiKey(id);
    setApiKeys((actuales) => actuales.map((k) => (k.id === id ? actualizada : k)));
    return actualizada;
  }, []);

  return { apiKeys, cargando, error, crear, revocar, recargar: cargar };
}
