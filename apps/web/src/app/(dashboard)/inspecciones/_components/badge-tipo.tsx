import { cn } from "@doonflow/shared";

const COLORES: Record<string, string> = {
  MINISTERIO_SALUD:     "bg-blue-light-5 text-blue",
  AUDITORIA_INTERNA:    "bg-yellow-light-4 text-yellow-dark",
  CALIDAD:              "bg-green-light-7 text-green-dark",
  SEGURIDAD_OCUPACIONAL:"bg-red-light/[0.12] text-red",
  SUPERVISION_OPERATIVA:"bg-gray-2 text-dark-4",
  OTRO:                 "bg-gray-2 text-dark-5",
};

const ETIQUETA: Record<string, string> = {
  MINISTERIO_SALUD:     "Min. Salud",
  AUDITORIA_INTERNA:    "Auditoría interna",
  CALIDAD:              "Calidad",
  SEGURIDAD_OCUPACIONAL:"Seg. Ocupacional",
  SUPERVISION_OPERATIVA:"Supervisión",
  OTRO:                 "Otro",
};

export function BadgeTipo({ tipo }: { tipo: string }) {
  return (
    <span className={cn("rounded-full px-3 py-0.5 text-body-xs font-medium", COLORES[tipo] ?? "bg-gray-2 text-dark-5")}>
      {ETIQUETA[tipo] ?? tipo}
    </span>
  );
}
