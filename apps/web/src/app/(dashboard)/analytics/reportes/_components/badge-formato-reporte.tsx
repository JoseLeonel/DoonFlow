import type { FormatoReporte } from "../_servicios/reportes.servicio";

export function BadgeFormatoReporte({ formato }: { formato: FormatoReporte }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-1 px-2.5 py-0.5 text-body-xs font-medium text-dark-4 dark:bg-dark-2 dark:text-dark-6">
      {formato === "EXCEL" ? "Excel" : "PDF"}
    </span>
  );
}
