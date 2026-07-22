"use client";

import { useCallback, useEffect, useState } from "react";
import { guardarPermisosDeRol, obtenerMatriz } from "../_servicios/permisos.servicio";
import type { MatrizPermisos } from "../_servicios/permisos.servicio";

export function usarMatrizPermisos() {
  const [matriz, setMatriz] = useState<MatrizPermisos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filasModificadas, setFilasModificadas] = useState<Map<string, string[]>>(new Map());

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setMatriz(await obtenerMatriz());
      setFilasModificadas(new Map());
    } catch {
      setError("No se pudo cargar la matriz de permisos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function toggle(rolId: string, permisoId: string) {
    if (!matriz) return;
    const rol = matriz.roles.find((r) => r.id === rolId);
    if (!rol || !rol.editable) return;

    const nuevosIds = rol.permisoIds.includes(permisoId)
      ? rol.permisoIds.filter((id) => id !== permisoId)
      : [...rol.permisoIds, permisoId];

    setMatriz({
      ...matriz,
      roles: matriz.roles.map((r) => (r.id === rolId ? { ...r, permisoIds: nuevosIds } : r)),
    });
    setFilasModificadas((prev) => new Map(prev).set(rolId, nuevosIds));
  }

  async function guardarCambios() {
    setGuardando(true);
    setError(null);
    try {
      for (const [rolId, permisoIds] of filasModificadas) {
        await guardarPermisosDeRol(rolId, permisoIds);
      }
      setFilasModificadas(new Map());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  }

  const hayCambiosPendientes = filasModificadas.size > 0;

  return { matriz, cargando, guardando, error, filasModificadas, hayCambiosPendientes, toggle, guardarCambios, recargar: cargar };
}
