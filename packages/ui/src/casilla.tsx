import { cn } from "@doonflow/shared";
import * as React from "react";

export interface PropsCasilla
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/** Checkbox con label, patrón portado de `Checkbox` de la plantilla. */
export function Casilla({ label, className, id, ...props }: PropsCasilla) {
  const inputId = id ?? props.name;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 font-medium",
        className,
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
        {...props}
      />
      {label}
    </label>
  );
}
