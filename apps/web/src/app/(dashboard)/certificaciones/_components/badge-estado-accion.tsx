import type { EstadoAccion } from "@doonflow/shared";

const ESTILO: Record<EstadoAccion, string> = {
  PENDIENTE: "bg-gray-3 text-dark-5",
  EN_PROCESO: "text-yellow-dark bg-yellow-light-4",
  EN_REVISION: "bg-blue-light/[0.08] text-blue",
  CUMPLIDO: "bg-green-light/[0.08] text-green",
  NO_CUMPLIDO: "bg-red-light/[0.08] text-red",
  VENCIDO: "bg-red-light/[0.08] text-red",
};

const ETIQUETA: Record<EstadoAccion, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  EN_REVISION: "En revisión",
  CUMPLIDO: "Cumplido",
  NO_CUMPLIDO: "No cumplido",
  VENCIDO: "Vencido",
};

interface PropsBadgeEstadoAccion {
  estado: EstadoAccion;
}

export function BadgeEstadoAccion({ estado }: PropsBadgeEstadoAccion) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-body-xs font-medium ${ESTILO[estado]}`}>
      {ETIQUETA[estado]}
    </span>
  );
}
