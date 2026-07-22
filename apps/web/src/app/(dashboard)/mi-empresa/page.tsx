"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerSesionActual } from "../../../lib/sesion.servicio";

export default function PaginaMiEmpresa() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerSesionActual()
      .then((sesion) => {
        if (sesion.alcance.tipo !== "CLIENTE") {
          router.replace("/");
          return;
        }
        router.replace(`/mantenimientos/clientes/${sesion.alcance.cliente.id}/editar?soloLectura=1`);
      })
      .catch(() => setError("No se pudo cargar tu empresa."));
  }, [router]);

  if (error) {
    return (
      <div className="p-6 md:p-7.5">
        <div className="rounded-[10px] border border-red-light bg-red-light/[0.06] p-8 text-center">
          <p className="text-sm font-medium text-red">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-7.5">
      <div className="h-4 w-64 animate-pulse rounded bg-gray-2 dark:bg-dark-3" />
    </div>
  );
}
