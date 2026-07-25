import { cn, formatearFechaCalendario } from "@doonflow/shared";
import type { PlanAuditoria } from "@doonflow/shared";

interface PropsTarjetaPlanAuditoria {
  plan: PlanAuditoria;
  onIniciarAhora: (id: string) => void;
}

const ESTILO_BADGE: Record<PlanAuditoria["estado"], string> = {
  PROGRAMADA: "bg-blue-light/[0.08] text-blue",
  EJECUTADA: "bg-green-light/[0.08] text-green",
  REPROGRAMADA: "bg-yellow-light/[0.08] text-yellow-dark",
};

const ETIQUETA_BADGE: Record<PlanAuditoria["estado"], string> = {
  PROGRAMADA: "● Programada",
  EJECUTADA: "✓ Ejecutada",
  REPROGRAMADA: "● Reprogramada",
};

export function TarjetaPlanAuditoria({ plan, onIniciarAhora }: PropsTarjetaPlanAuditoria) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div>
        <p className="text-sm font-medium text-dark dark:text-white">{plan.sucursalNombre}</p>
        <p className="text-body-xs text-dark-4 dark:text-dark-6">
          {formatearFechaCalendario(plan.fechaObjetivo)} · Resp: {plan.responsableSugeridoNombre ?? "—"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-body-xs font-medium", ESTILO_BADGE[plan.estado])}>
          {ETIQUETA_BADGE[plan.estado]}
        </span>
        {plan.estado !== "EJECUTADA" && (
          <button
            type="button"
            onClick={() => onIniciarAhora(plan.id)}
            className="text-body-xs font-medium text-primary hover:underline"
          >
            Iniciar ahora
          </button>
        )}
      </div>
    </div>
  );
}
