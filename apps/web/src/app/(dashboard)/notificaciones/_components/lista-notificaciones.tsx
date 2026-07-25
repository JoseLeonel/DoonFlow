"use client";

import { useRouter } from "next/navigation";
import type { Notificacion } from "@doonflow/shared";

interface PropsListaNotificaciones {
  notificaciones: Notificacion[];
  onMarcarLeida: (id: string) => void;
  onMarcarTodasLeidas: () => void;
}

function antiguedad(creadoEn: string): string {
  const minutos = Math.floor((Date.now() - new Date(creadoEn).getTime()) / (1000 * 60));
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} hora${horas === 1 ? "" : "s"}`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} día${dias === 1 ? "" : "s"}`;
}

/** 006-vigencia-notificaciones-portal — `inspeccion` navega directo (mismo id); `accion_correctiva`/
 * `hallazgo` no traen el id de la certificación de origen, así que navegan al listado acotado. */
function rutaDestino(n: Notificacion): string {
  switch (n.referenciaTipo) {
    case "inspeccion": return `/certificaciones/${n.referenciaId}/revision`;
    case "accion_correctiva": return "/certificaciones/seguimiento";
    case "hallazgo": return "/certificaciones";
  }
}

export function ListaNotificaciones({ notificaciones, onMarcarLeida, onMarcarTodasLeidas }: PropsListaNotificaciones) {
  const router = useRouter();

  const irA = (n: Notificacion) => {
    if (!n.leidaEn) onMarcarLeida(n.id);
    router.push(rutaDestino(n));
  };

  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-[360px] max-h-[420px] overflow-y-auto rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3 dark:border-dark-3">
        <h3 className="text-body-sm font-semibold text-dark dark:text-white">Notificaciones</h3>
        {notificaciones.some((n) => !n.leidaEn) && (
          <button type="button" onClick={onMarcarTodasLeidas} className="text-body-xs font-medium text-primary hover:underline">
            Marcar todas
          </button>
        )}
      </div>

      {notificaciones.length === 0 ? (
        <p className="px-4 py-6 text-center text-body-sm text-dark-4 dark:text-dark-6">No tienes notificaciones</p>
      ) : (
        <ul className="divide-y divide-stroke dark:divide-dark-3">
          {notificaciones.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => irA(n)}
                className={`flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-gray-1 dark:hover:bg-dark-2 ${n.leidaEn ? "" : "bg-gray-1 dark:bg-dark-2"}`}
              >
                {!n.leidaEn && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                <span className={n.leidaEn ? "ml-4 text-body-xs text-dark-4 dark:text-dark-6" : "text-body-xs text-dark dark:text-white"}>
                  <span className="block">{n.mensaje}</span>
                  <span className="mt-0.5 block text-dark-4 dark:text-dark-6">{antiguedad(n.creadoEn)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
