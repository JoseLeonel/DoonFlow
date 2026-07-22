import type { ReactNode } from "react";

export interface ColumnaComparativa {
  id: string;
  titulo: string;
}

export interface FilaComparativa {
  etiqueta: string;
  valores: Record<string, ReactNode>;
}

export interface PropsTablaComparativa {
  columnas: ColumnaComparativa[];
  filas: FilaComparativa[];
}

/**
 * Tabla lado a lado con N columnas dinámicas (una por entidad comparada, ej. sucursal) y filas
 * fijas de métricas — sin lógica de dominio, solo presentación. Componente transversal de
 * `packages/ui`, consumido por `agente-analisis` (008-reportes-analytics) sin reimplementarlo.
 */
export function TablaComparativa({ columnas, filas }: PropsTablaComparativa) {
  return (
    <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3">
              <th className="px-5 py-3.5 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6" />
              {columnas.map((columna) => (
                <th key={columna.id} className="px-5 py-3.5 text-left text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">
                  {columna.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.etiqueta} className="border-b border-stroke last:border-0 dark:border-dark-3">
                <td className="px-5 py-3 font-medium text-dark dark:text-white">{fila.etiqueta}</td>
                {columnas.map((columna) => (
                  <td key={columna.id} className="px-5 py-3 text-dark-4 dark:text-dark-6">
                    {columna.id in fila.valores ? fila.valores[columna.id] : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
