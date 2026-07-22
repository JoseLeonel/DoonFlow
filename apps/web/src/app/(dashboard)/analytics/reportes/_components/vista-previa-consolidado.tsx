import type { DatosConsolidadoCliente } from "../_servicios/reportes.servicio";

interface Props {
  datos: DatosConsolidadoCliente | null;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
}

export function VistaPreviaConsolidado({ datos, cargando, error, onReintentar }: Props) {
  if (cargando) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-gray-2 dark:bg-dark-3" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[10px] bg-white p-6 text-center shadow-1 dark:bg-gray-dark dark:shadow-card">
        <p className="mb-3 text-body-sm text-red">{error}</p>
        <button type="button" onClick={onReintentar} className="text-sm font-medium text-primary hover:underline">Reintentar</button>
      </div>
    );
  }

  if (!datos) return null;

  return (
    <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="border-b border-stroke px-5 py-3 text-body-sm font-medium text-dark dark:border-dark-3 dark:text-white">
        Vista previa — {datos.clienteNombre} · {datos.periodo.fechaDesde} – {datos.periodo.fechaHasta}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3">
              {["Sucursal", "Certif. período", "Puntaje", "Clasificación"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.sucursales.map((fila) => (
              <tr key={fila.sucursalId} className="border-b border-stroke last:border-0 dark:border-dark-3">
                <td className="px-5 py-3 font-medium text-dark dark:text-white">{fila.sucursalNombre}</td>
                <td className="px-5 py-3 text-dark-4 dark:text-dark-6">{fila.certificacionesDelPeriodo}</td>
                <td className="px-5 py-3 text-dark-4 dark:text-dark-6">
                  {fila.puntajeVigente !== null ? `${fila.puntajeVigente}/${fila.puntajeMaximoVigente}` : "—"}
                </td>
                <td className="px-5 py-3 text-dark-4 dark:text-dark-6">{fila.clasificacionVigente ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
