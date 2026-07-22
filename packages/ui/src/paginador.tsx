"use client";

const TAMANOS_PAGINA = [10, 20, 50];

export interface PropsPaginador {
  pagina: number;
  porPagina: number;
  total: number;
  onCambiarPagina: (pagina: number) => void;
  onCambiarPorPagina: (porPagina: number) => void;
}

/**
 * Control de paginación genérico, sin lógica de dominio — solo consume `{ pagina, porPagina, total }`
 * (el `meta` que ya retorna el envelope de la API) y notifica cambios por callback.
 * 010-seguridad-privacidad-continuidad, HU-3.
 */
export function Paginador({ pagina, porPagina, total, onCambiarPagina, onCambiarPorPagina }: PropsPaginador) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-3 text-body-sm text-dark-4 dark:text-dark-6">
      <span>
        Mostrando {desde}–{hasta} de {total}
      </span>

      <div className="flex items-center gap-3">
        <select
          value={porPagina}
          onChange={(e) => onCambiarPorPagina(Number(e.target.value))}
          className="rounded-lg border border-stroke bg-white px-2 py-1.5 text-body-sm text-dark outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        >
          {TAMANOS_PAGINA.map((tamano) => (
            <option key={tamano} value={tamano}>{tamano} / página</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onCambiarPagina(pagina - 1)}
            disabled={pagina <= 1}
            className="rounded-lg border border-stroke px-3 py-1.5 text-body-sm text-dark disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-3 dark:text-white"
          >
            Anterior
          </button>
          <span className="px-1">{pagina} / {totalPaginas}</span>
          <button
            type="button"
            onClick={() => onCambiarPagina(pagina + 1)}
            disabled={pagina >= totalPaginas}
            className="rounded-lg border border-stroke px-3 py-1.5 text-body-sm text-dark disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-3 dark:text-white"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
