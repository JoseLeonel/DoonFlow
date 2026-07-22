import type { IndicadoresPlan as IndicadoresPlanData } from "@doonflow/shared";

interface PropsIndicadoresPlan {
  indicadores: IndicadoresPlanData;
}

/** Tarjetas KPI del plan de cumplimiento — muestra lo que ya viene calculado del backend, no recalcula nada. */
export function IndicadoresPlan({ indicadores }: PropsIndicadoresPlan) {
  const tarjetas = [
    { etiqueta: "Total", valor: indicadores.total },
    { etiqueta: "Pendientes", valor: indicadores.pendientes },
    { etiqueta: "Vencidas", valor: indicadores.vencidas, resaltar: indicadores.vencidas > 0 },
    { etiqueta: "% Cumplimiento", valor: `${indicadores.porcentajeCumplimiento}%` },
    { etiqueta: "Próximas a vencer (7 d.)", valor: indicadores.proximasAVencer },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
      {tarjetas.map((t) => (
        <div key={t.etiqueta} className="rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-xs text-dark-4 dark:text-dark-6">{t.etiqueta}</p>
          <p className={`text-heading-6 font-bold ${t.resaltar ? "text-red" : "text-dark dark:text-white"}`}>
            {t.valor}
          </p>
        </div>
      ))}
    </div>
  );
}
