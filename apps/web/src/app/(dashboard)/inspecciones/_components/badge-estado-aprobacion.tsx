import { cn } from "@doonflow/shared";
import type { EstadoAprobacionPlantilla } from "@doonflow/shared";

const CONFIG: Record<EstadoAprobacionPlantilla, { texto: string; color: string }> = {
  BORRADOR:    { texto: "Borrador",    color: "bg-gray-3 text-dark-5 dark:bg-dark-3 dark:text-dark-6" },
  EN_REVISION: { texto: "En revisión", color: "bg-yellow-light/[0.08] text-yellow-dark" },
  APROBADA:    { texto: "Aprobada",    color: "bg-green-light/[0.08] text-green" },
  RECHAZADA:   { texto: "Rechazada",   color: "bg-red-light/[0.08] text-red" },
};

interface PropsBadgeEstadoAprobacion {
  estado: EstadoAprobacionPlantilla;
  comentarioResolucion?: string | null;
}

/** Badge de `estadoAprobacion` — 007-gobernanza-permisos-aprobacion. */
export function BadgeEstadoAprobacion({ estado, comentarioResolucion }: PropsBadgeEstadoAprobacion) {
  const { texto, color } = CONFIG[estado];
  const titulo = estado === "RECHAZADA" && comentarioResolucion ? comentarioResolucion : undefined;

  return (
    <span
      title={titulo}
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-body-xs font-medium", color)}
    >
      {estado === "RECHAZADA" && "⚠ "}
      {texto}
    </span>
  );
}
