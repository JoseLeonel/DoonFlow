import { cn } from "@doonflow/shared";

/** Badges visuales para cada pregunta: requerida / tipo de comentario. */
export function IndicadorRequerida() {
  return (
    <span className="rounded-full bg-red-light/[0.1] px-2 py-0.5 text-body-xs font-medium text-red">
      Requerida
    </span>
  );
}

export function IndicadorComentario({ regla }: { regla: string }) {
  const cfg: Record<string, { texto: string; color: string }> = {
    NUNCA:                      { texto: "Sin comentario",      color: "bg-gray-2 text-dark-5 dark:bg-dark-3 dark:text-dark-6" },
    SIEMPRE:                    { texto: "Comentario obligatorio", color: "bg-blue-light-5 text-blue" },
    CUANDO_NEGATIVO:            { texto: "Comentario si No",    color: "bg-yellow-light-4 text-yellow-dark" },
    CUANDO_PUNTAJE_MENOR_MAXIMO:{ texto: "Comentario si < máx", color: "bg-yellow-light-4 text-yellow-dark" },
    CONFIGURABLE:               { texto: "Comentario configurable", color: "bg-gray-2 text-dark-5" },
  };
  const { texto, color } = cfg[regla] ?? cfg["NUNCA"]!;
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-body-xs font-medium", color)}>{texto}</span>
  );
}

export function IndicadorEvidencia({ obligatoria, minima }: { obligatoria: boolean; minima: number }) {
  if (!obligatoria) return null;
  return (
    <span className="rounded-full bg-primary/[0.08] px-2 py-0.5 text-body-xs font-medium text-primary">
      Evidencia {minima > 0 ? `mín. ${minima}` : "opcional"}
    </span>
  );
}
