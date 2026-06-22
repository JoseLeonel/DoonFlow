/**
 * Home del dashboard ("/"). Protegida por src/middleware.ts (redirige a /auth/login sin sesión).
 * Placeholder hasta que agente-fincas (u otro agente de dominio) construya el contenido real.
 */
export default function PaginaInicioDashboard() {
  return (
    <main className="p-7.5">
      <h1 className="text-heading-6 font-bold text-dark dark:text-white">
        Bienvenido a DoonFlow
      </h1>
      <p className="mt-2 font-medium text-dark-4 dark:text-dark-6">
        El contenido de cada módulo (fincas, trazabilidad, inventario, analytics) se construye
        en su propio agente de dominio.
      </p>
    </main>
  );
}
