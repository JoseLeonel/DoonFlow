import type { EvidenciaConsolidada, OrigenEvidencia } from "@doonflow/shared";

const ETIQUETA_ORIGEN: Record<OrigenEvidencia, string> = {
  RESPUESTA: "Respuestas",
  HALLAZGO: "Hallazgos",
  ACCION_CORRECTIVA: "Acciones correctivas",
};

function esDocumento(tipo: string): boolean {
  return tipo === "application/pdf" || tipo.includes("word") || tipo.includes("document");
}

interface PropsGaleriaEvidencias {
  evidencias: EvidenciaConsolidada[];
}

/** Galería consolidada de evidencias de una certificación, agrupadas por origen. */
export function GaleriaEvidencias({ evidencias }: PropsGaleriaEvidencias) {
  if (evidencias.length === 0) {
    return <p className="text-body-sm text-dark-4 dark:text-dark-6">No hay evidencias cargadas todavía.</p>;
  }

  const grupos = (Object.keys(ETIQUETA_ORIGEN) as OrigenEvidencia[])
    .map((origen) => ({ origen, items: evidencias.filter((e) => e.origen === origen) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {grupos.map((g) => (
        <div key={g.origen}>
          <h3 className="mb-2 text-body-sm font-semibold text-dark dark:text-white">{ETIQUETA_ORIGEN[g.origen]}</h3>
          <ul className="space-y-1.5">
            {g.items.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-body-xs">
                <span aria-hidden>{esDocumento(e.tipo) ? "📄" : "🖼️"}</span>
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {e.nombre}
                </a>
                <span className="text-dark-4 dark:text-dark-6">
                  {new Date(e.creadoEn).toLocaleDateString("es-CR")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
