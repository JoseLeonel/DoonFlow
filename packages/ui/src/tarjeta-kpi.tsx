export interface PropsTarjetaKpi {
  valor: string | number;
  etiqueta: string;
}

/** Tarjeta de indicador agregado (KPI) — sin lógica de datos propia, solo presentación. */
export function TarjetaKpi({ valor, etiqueta }: PropsTarjetaKpi) {
  return (
    <div className="rounded-[10px] bg-white p-5 text-center shadow-1 dark:bg-gray-dark dark:shadow-card">
      <p className="text-heading-3 font-bold text-primary">{valor}</p>
      <p className="mt-1 text-body-sm text-dark-4 dark:text-dark-6">{etiqueta}</p>
    </div>
  );
}
