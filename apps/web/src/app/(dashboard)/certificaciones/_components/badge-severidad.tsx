import type { Severidad } from "@doonflow/shared";

const ESTILO: Record<Severidad, string> = {
  CRITICA: "bg-red-light/[0.08] text-red",
  MAYOR: "bg-naranja-light text-naranja",
  MENOR: "text-yellow-dark bg-yellow-light-4",
};

const ETIQUETA: Record<Severidad, string> = {
  CRITICA: "Crítica",
  MAYOR: "Mayor",
  MENOR: "Menor",
};

interface PropsBadgeSeveridad {
  severidad: Severidad;
}

export function BadgeSeveridad({ severidad }: PropsBadgeSeveridad) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-body-xs font-medium ${ESTILO[severidad]}`}>
      {ETIQUETA[severidad]}
    </span>
  );
}
