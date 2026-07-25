"use client";

import { useEffect, useState } from "react";
import { CampanaNotificaciones } from "@doonflow/ui";
import { useContextoSidebar } from "./sidebar-contexto";
import { useNotificaciones } from "../notificaciones/_hooks/use-notificaciones";
import { ListaNotificaciones } from "../notificaciones/_components/lista-notificaciones";
import { obtenerSesionActual } from "../../../lib/sesion.servicio";

function IconoHamburguesa({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

export function Header() {
  const { toggleSidebar } = useContextoSidebar();
  const { notificaciones, noLeidas, abierto, toggle, marcarLeida, marcarTodasLeidas } = useNotificaciones();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    obtenerSesionActual().then((sesion) => setEmail(sesion.usuario.email)).catch(() => {});
  }, []);

  const inicial = email ? email[0]!.toUpperCase() : "?";

  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-4 border-b border-stroke bg-white px-4 md:px-6 dark:border-dark-3 dark:bg-gray-dark">
      <button
        onClick={toggleSidebar}
        aria-label="Abrir o cerrar menú"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-dark-4 transition-colors hover:bg-gray-1 hover:text-dark dark:text-dark-6 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <IconoHamburguesa className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <CampanaNotificaciones contador={noLeidas} abierto={abierto} onToggle={toggle}>
        <ListaNotificaciones notificaciones={notificaciones} onMarcarLeida={marcarLeida} onMarcarTodasLeidas={marcarTodasLeidas} />
      </CampanaNotificaciones>

      <div className="flex items-center gap-2 text-sm text-dark-4 dark:text-dark-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {inicial}
        </div>
        <span className="hidden sm:inline">{email ?? "…"}</span>
      </div>
    </header>
  );
}
