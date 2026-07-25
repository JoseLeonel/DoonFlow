import type { CertificadoPublico } from "@doonflow/shared";
import { formatearFechaCalendario } from "@doonflow/shared";

interface PropsSelloVerificacion {
  resultado: CertificadoPublico | null;
}

/** Sello visual autocontenido — sin ningún enlace de navegación al resto del sistema. */
export function SelloVerificacion({ resultado }: PropsSelloVerificacion) {
  if (!resultado) {
    return (
      <div className="rounded-[10px] border-2 border-red bg-white p-6 text-center shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="mb-2 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-light/[0.08] text-red">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <p className="text-body-lg font-bold text-red">No encontrada</p>
        <p className="mt-2 text-body-sm text-dark-4 dark:text-dark-6">
          No se encontró ninguna certificación con ese código.
        </p>
      </div>
    );
  }

  const vigente = resultado.estado === "VIGENTE";

  return (
    <div
      className={`rounded-[10px] bg-white p-6 text-center shadow-1 dark:bg-gray-dark dark:shadow-card ${vigente ? "border-2 border-green" : ""}`}
    >
      <div
        className={`mb-2 inline-flex h-14 w-14 items-center justify-center rounded-full ${vigente ? "bg-green-light/[0.08] text-green" : "bg-gray-3 text-dark-5"}`}
      >
        {vigente ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        )}
      </div>
      <p className={`text-body-lg font-bold ${vigente ? "text-green" : "text-dark-5"}`}>
        {vigente ? "Vigente" : "Vencida"}
      </p>

      <div className="mt-4 space-y-1 text-left text-body-sm">
        <p className="text-dark dark:text-white">{resultado.cliente}</p>
        <p className="text-dark-4 dark:text-dark-6">{resultado.sucursal}</p>
        <p className="mt-3 text-dark-4 dark:text-dark-6">
          Emitida: <span className="text-dark dark:text-white">{new Date(resultado.fechaEmision).toLocaleDateString("es-CR")}</span>
        </p>
        <p className="text-dark-4 dark:text-dark-6">
          Vence: <span className="text-dark dark:text-white">{formatearFechaCalendario(resultado.fechaVencimiento)}</span>
        </p>
        <p className="text-dark-4 dark:text-dark-6">
          Plantilla: <span className="text-dark dark:text-white">{resultado.nombrePlantilla}</span>
        </p>
      </div>
    </div>
  );
}
