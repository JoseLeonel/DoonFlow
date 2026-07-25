import { Suspense } from "react";
import { FormularioLogin } from "./_components/formulario-login";

export const metadata = { title: "Iniciar sesión — DoonFlow" };

/** Composición: solo arma el layout (estilo plantilla nextjs-admin-dashboard-main) + el componente. */
export default function PaginaLogin() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[1000px] rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="flex flex-wrap items-center">
          <div className="w-full md:w-1/2">
            <div className="w-full p-4 md:p-12.5 xl:p-15">
              <h1 className="mb-1.5 text-2xl font-bold text-dark dark:text-white">
                Bienvenido de nuevo
              </h1>
              <p className="mb-6 font-medium text-dark-4 dark:text-dark-6">
                Inicia sesión en tu cuenta de DoonFlow
              </p>

              <Suspense fallback={null}>
                <FormularioLogin />
              </Suspense>
            </div>
          </div>

          {/* Objetivo responsive tablet/desktop (ver CLAUDE.md): visible desde md, no solo xl. */}
          <div className="hidden w-full p-7.5 md:block md:w-1/2">
            <div className="overflow-hidden rounded-2xl bg-primary px-12.5 pt-12.5">
              <p className="mb-3 text-xl font-medium text-white">DoonFlow</p>
              <h2 className="mb-4 text-2xl font-bold text-white">
                La cadena agroalimentaria, conectada.
              </h2>
              <p className="w-full max-w-[375px] font-medium text-white/80">
                Fincas, trazabilidad, inventario y analítica en un solo lugar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
