"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ContextoSidebar = {
  abierto: boolean;
  setAbierto: (v: boolean) => void;
  esMobile: boolean;
  toggleSidebar: () => void;
};

const ContextoSidebarCtx = createContext<ContextoSidebar | null>(null);

export function useContextoSidebar() {
  const ctx = useContext(ContextoSidebarCtx);
  if (!ctx) throw new Error("useContextoSidebar debe usarse dentro de ProveedorSidebar");
  return ctx;
}

export function ProveedorSidebar({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(true);
  const [esMobile, setEsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const actualizar = (e: MediaQueryListEvent | MediaQueryList) => {
      setEsMobile(e.matches);
      setAbierto(!e.matches);
    };
    actualizar(mq);
    mq.addEventListener("change", actualizar);
    return () => mq.removeEventListener("change", actualizar);
  }, []);

  return (
    <ContextoSidebarCtx.Provider
      value={{ abierto, setAbierto, esMobile, toggleSidebar: () => setAbierto((v) => !v) }}
    >
      {children}
    </ContextoSidebarCtx.Provider>
  );
}
