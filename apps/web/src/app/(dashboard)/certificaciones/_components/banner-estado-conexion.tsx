import { cn } from "@doonflow/shared";
import type { EstadoSincronizacion } from "../_hooks/use-captura-offline";

interface PropsBannerEstadoConexion {
  estado: EstadoSincronizacion;
  pendientes: number;
  alertaDatosAntiguos?: boolean;
}

const CONFIGURACION: Record<Exclude<EstadoSincronizacion, null>, { texto: string; clases: string }> = {
  DESCONECTADO: { texto: "Sin conexión — guardando localmente", clases: "bg-yellow-light/[0.08] text-yellow-dark" },
  SINCRONIZANDO: { texto: "Sincronizando...", clases: "bg-primary/10 text-primary" },
  SINCRONIZADO: { texto: "Sincronizado", clases: "bg-green-light/[0.08] text-green" },
  ERROR_PARCIAL: { texto: "Reintentando sincronización...", clases: "bg-yellow-light/[0.08] text-yellow-dark" },
};

/** Banner fijo de estado de conexión/sincronización del wizard — nunca bloquea el formulario (012-captura-offline-campo). */
export function BannerEstadoConexion({ estado, pendientes, alertaDatosAntiguos }: PropsBannerEstadoConexion) {
  if (!estado) return null;
  const { texto, clases } = CONFIGURACION[estado];

  return (
    <div className={cn("mb-4 flex flex-col gap-0.5 rounded-lg px-4 py-2 text-body-sm font-medium", clases)}>
      <div className="flex items-center gap-2">
        {estado === "SINCRONIZANDO" && (
          <span
            role="status"
            aria-label="Sincronizando"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
          />
        )}
        <span>{texto}</span>
        {pendientes > 0 && (estado === "DESCONECTADO" || estado === "ERROR_PARCIAL") && (
          <span className="text-body-xs font-normal opacity-80">({pendientes} pendiente{pendientes === 1 ? "" : "s"})</span>
        )}
      </div>
      {alertaDatosAntiguos && (
        <p className="text-body-xs font-normal">
          Llevas más de 24h con datos sin sincronizar en este dispositivo — sincroniza pronto para no arriesgar el trabajo capturado.
        </p>
      )}
    </div>
  );
}
