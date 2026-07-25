"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHallazgosFrecuentes } from "../_hooks/use-hallazgos-frecuentes";
import { FormularioHallazgoFrecuente } from "../_components/formulario-hallazgo-frecuente";

export default function PaginaNuevoHallazgoFrecuente() {
  const router = useRouter();
  const { crear } = useHallazgosFrecuentes();

  return (
    <div className="p-6 md:p-7.5">
      <nav className="mb-4 text-body-xs text-dark-4 dark:text-dark-6">
        <Link href="/mantenimientos" className="hover:text-primary">Mantenimientos</Link>
        <span className="mx-1.5">/</span>
        <Link href="/mantenimientos/hallazgos-frecuentes" className="hover:text-primary">Hallazgos frecuentes</Link>
        <span className="mx-1.5">/</span>
        <span>Nuevo</span>
      </nav>

      <div className="mx-auto max-w-[560px]">
        <h1 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">Nuevo hallazgo frecuente</h1>
        <FormularioHallazgoFrecuente
          onGuardar={async (datos) => {
            await crear(datos);
            router.push("/mantenimientos/hallazgos-frecuentes");
          }}
        />
      </div>
    </div>
  );
}
