import { cn } from "@doonflow/shared";
import type { ItemAtencion } from "@doonflow/shared";

interface PropsTablaAtencionRequerida {
  items: ItemAtencion[];
}

export function TablaAtencionRequerida({ items }: PropsTablaAtencionRequerida) {
  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-body-sm text-dark-4 dark:text-dark-6">
        Nada requiere atención en este momento.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-stroke dark:divide-dark-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-yellow-dark">⚠</span>
            <div>
              <p className="text-sm text-dark dark:text-white">
                {item.tipo === "certificacion_por_vencer" ? "Certificación por vencer" : `Acción vencida: "${item.descripcion}"`}
              </p>
              <p className="text-body-xs text-dark-4 dark:text-dark-6">{item.sucursal} — {item.cliente}</p>
            </div>
          </div>
          <span className={cn("text-body-sm font-medium", item.diasVencida !== undefined ? "text-red" : (item.diasRestantes ?? 99) <= 5 ? "text-yellow-dark" : "text-dark-4 dark:text-dark-6")}>
            {item.diasVencida !== undefined ? `${item.diasVencida} día(s) vencida` : `${item.diasRestantes} día(s)`}
          </span>
        </li>
      ))}
    </ul>
  );
}
