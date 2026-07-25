import type { EstadoApelacion } from "@doonflow/shared";

const ESTILO: Record<EstadoApelacion, string> = {
  ABIERTA: "bg-yellow-light/[0.08] text-yellow-dark",
  EN_REVISION: "bg-yellow-light/[0.08] text-yellow-dark",
  ACEPTADA: "bg-green-light/[0.08] text-green",
  RECHAZADA: "bg-red-light/[0.08] text-red",
};

const ETIQUETA: Record<EstadoApelacion, string> = {
  ABIERTA: "Abierta",
  EN_REVISION: "En revisión",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
};

interface PropsBadgeEstadoApelacion {
  estado: EstadoApelacion;
}

export function BadgeEstadoApelacion({ estado }: PropsBadgeEstadoApelacion) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-body-xs font-medium ${ESTILO[estado]}`}>
      ● {ETIQUETA[estado]}
    </span>
  );
}
