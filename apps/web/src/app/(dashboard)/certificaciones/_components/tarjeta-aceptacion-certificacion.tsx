import Link from "next/link";

interface PropsTarjetaAceptacionCertificacion {
  visible: boolean;
  certificacionId: string;
  aceptando: boolean;
  error: string | null;
  onAceptar: () => void;
}

/** 011-aceptacion-apelaciones-certificacion — HU-1: el cliente reconoce o apela el resultado. */
export function TarjetaAceptacionCertificacion({
  visible, certificacionId, aceptando, error, onAceptar,
}: PropsTarjetaAceptacionCertificacion) {
  if (!visible) return null;

  return (
    <div className="mb-6 rounded-[10px] border-l-4 border-primary bg-white p-4 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <h2 className="mb-1 text-body-sm font-semibold text-dark dark:text-white">
        Certificación pendiente de tu confirmación
      </h2>
      <p className="mb-3 text-body-xs text-dark-4 dark:text-dark-6">
        Al aceptar confirmas que revisaste el resultado de esta certificación.
      </p>
      {error && <p className="mb-3 text-body-xs text-red">{error}</p>}
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={aceptando}
          onClick={onAceptar}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {aceptando ? "Aceptando..." : "Aceptar"}
        </button>
        <Link
          href={`/certificaciones/${certificacionId}/apelacion/nueva`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Presentar apelación en su lugar →
        </Link>
      </div>
    </div>
  );
}
