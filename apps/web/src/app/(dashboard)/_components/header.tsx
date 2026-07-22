"use client";

import { usarContextoSidebar } from "./sidebar-contexto";

function IconoHamburguesa({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

export function Header() {
  const { toggleSidebar } = usarContextoSidebar();

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

      <div className="flex items-center gap-2 text-sm text-dark-4 dark:text-dark-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          A
        </div>
        <span className="hidden sm:inline">admin@doonflow.demo</span>
      </div>
    </header>
  );
}
