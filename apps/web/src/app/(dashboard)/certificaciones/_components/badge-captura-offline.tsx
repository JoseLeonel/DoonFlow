interface PropsBadgeCapturaOffline {
  capturaOffline: boolean;
  sincronizadoEn: string | null;
}

/** Badge "Capturada offline" para vistas administrativas (listado/detalle) — solo se renderiza si `capturaOffline === true`. */
export function BadgeCapturaOffline({ capturaOffline, sincronizadoEn }: PropsBadgeCapturaOffline) {
  if (!capturaOffline) return null;

  const fecha = sincronizadoEn
    ? new Date(sincronizadoEn).toLocaleString("es-CR", { timeZone: "America/Costa_Rica", dateStyle: "short", timeStyle: "short" })
    : null;

  return (
    <span className="inline-flex items-center rounded-full bg-gray-1 px-2.5 py-0.5 text-body-xs font-medium text-dark-4 dark:bg-dark-2 dark:text-dark-6">
      Capturada offline{fecha ? ` · sincronizada ${fecha}` : ""}
    </span>
  );
}
