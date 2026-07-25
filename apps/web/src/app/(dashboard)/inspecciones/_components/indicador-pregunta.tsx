/** Badge visual de evidencia obligatoria para cada pregunta. */
export function IndicadorEvidencia({ obligatoria, minima }: { obligatoria: boolean; minima: number }) {
  if (!obligatoria) return null;
  return (
    <span className="rounded-full bg-primary/[0.08] px-2 py-0.5 text-body-xs font-medium text-primary">
      Evidencia {minima > 0 ? `mín. ${minima}` : "opcional"}
    </span>
  );
}
