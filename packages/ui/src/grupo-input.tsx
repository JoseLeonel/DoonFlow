import { cn } from "@doonflow/shared";
import * as React from "react";

export interface PropsGrupoInput
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icono?: React.ReactNode;
  className?: string;
}

/** Campo de formulario con label + ícono, patrón portado de `InputGroup` de la plantilla. */
export function GrupoInput({
  label,
  icono,
  className,
  id,
  ...props
}: PropsGrupoInput) {
  const inputId = id ?? props.name;

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="mb-1.5 block font-medium text-dark dark:text-white"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          className="w-full rounded-lg border border-stroke bg-transparent px-5 py-3 pl-12.5 text-dark outline-none transition focus:border-primary disabled:cursor-default disabled:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
          {...props}
        />
        {icono && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-5">
            {icono}
          </span>
        )}
      </div>
    </div>
  );
}
