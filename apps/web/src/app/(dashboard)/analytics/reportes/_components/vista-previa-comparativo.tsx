import { TablaComparativa } from "@doonflow/ui";
import type { ColumnaComparativa, FilaComparativa } from "@doonflow/ui";
import type { DatosComparativoSucursales } from "../_servicios/reportes.servicio";

interface Props {
  datos: DatosComparativoSucursales | null;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
}

/** Alcance reducido (ver memoria/decisiones.md, 2026-07-21): sin vigente/vencida — solo si hubo certificación en el período. */
export function VistaPreviaComparativo({ datos, cargando, error, onReintentar }: Props) {
  if (cargando) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-gray-2 dark:bg-dark-3" />)}
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

  const columnas: ColumnaComparativa[] = datos.filas.map((f) => ({ id: f.sucursalId, titulo: f.sucursalNombre }));

  const filas: FilaComparativa[] = [
    {
      etiqueta: "Puntaje",
      valores: Object.fromEntries(datos.filas.map((f) => [f.sucursalId, f.puntaje !== null ? `${f.puntaje}/${f.puntajeMaximo}` : "—"])),
    },
    {
      etiqueta: "% Cumplimiento",
      valores: Object.fromEntries(datos.filas.map((f) => [f.sucursalId, f.porcentajeCumplimiento !== null ? `${f.porcentajeCumplimiento}%` : "—"])),
    },
    {
      etiqueta: "Clasificación",
      valores: Object.fromEntries(datos.filas.map((f) => [f.sucursalId, f.clasificacion ?? "—"])),
    },
    {
      etiqueta: "Certificación en el período",
      valores: Object.fromEntries(
        datos.filas.map((f) => [
          f.sucursalId,
          f.tieneCertificacionEnPeriodo
            ? <span key="si" className="text-green dark:text-green-light">● Sí</span>
            : <span key="no" className="text-dark-4 dark:text-dark-6">○ No</span>,
        ]),
      ),
    },
  ];

  return (
    <div>
      <p className="mb-3 text-body-sm font-medium text-dark dark:text-white">
        Vista previa — Comparativo de sucursales · {datos.clienteNombre} · {datos.periodo.fechaDesde} – {datos.periodo.fechaHasta}
      </p>
      <TablaComparativa columnas={columnas} filas={filas} />
    </div>
  );
}
