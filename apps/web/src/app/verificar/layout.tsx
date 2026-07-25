/**
 * 006-vigencia-notificaciones-portal — layout del portal público de verificación.
 * Hermano de `apps/web/src/app/auth/`, no hijo de `(dashboard)`: sin Sidebar/Header, sin
 * guard de sesión (ver `middleware.ts` → RUTAS_PUBLICAS).
 */
export default function LayoutVerificar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-2 px-4 py-10 dark:bg-[#020d1a]">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 14.2a7.2 7.2 0 0 1-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 0 1-6 3.22z" />
          </svg>
        </div>
        <span className="text-lg font-bold text-dark dark:text-white">DoonFlow</span>
      </div>

      <div className="w-full max-w-[420px]">{children}</div>

      <p className="mt-8 text-center text-body-xs text-dark-4 dark:text-dark-6">
        Este documento no requiere sesión para validarse. DoonFlow © {new Date().getFullYear()}
      </p>
    </div>
  );
}
