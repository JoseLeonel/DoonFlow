import type { ResultadoFinal } from "@doonflow/shared";

const ESTILO: Record<ResultadoFinal, string> = {
  APROBADA: "bg-green-light/[0.08] text-green",
  APROBADA_CON_OBSERVACIONES: "text-yellow-dark bg-yellow-light-4",
  RECHAZADA: "bg-red-light/[0.08] text-red",
};

const ETIQUETA: Record<ResultadoFinal, string> = {
  APROBADA: "Aprobada",
  APROBADA_CON_OBSERVACIONES: "Aprobada con observaciones",
  RECHAZADA: "Rechazada",
};

interface PropsBadgeResultadoFinal {
  resultado: ResultadoFinal;
}

export function BadgeResultadoFinal({ resultado }: PropsBadgeResultadoFinal) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-body-xs font-medium ${ESTILO[resultado]}`}>
      {ETIQUETA[resultado]}
    </span>
  );
}
