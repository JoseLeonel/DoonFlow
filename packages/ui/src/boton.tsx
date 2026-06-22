import { cn } from "@doonflow/shared";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const variantesBoton = cva(
  "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg p-4 font-medium transition disabled:cursor-not-allowed disabled:opacity-70",
  {
    variants: {
      variante: {
        primario: "bg-primary text-white hover:bg-opacity-90",
        secundario:
          "border border-stroke bg-white text-dark hover:bg-gray-1 dark:border-dark-3 dark:bg-dark-2 dark:text-white",
      },
    },
    defaultVariants: { variante: "primario" },
  },
);

export interface PropsBoton
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variantesBoton> {
  cargando?: boolean;
}

export function Boton({
  className,
  variante,
  cargando,
  children,
  disabled,
  ...props
}: PropsBoton) {
  return (
    <button
      className={cn(variantesBoton({ variante }), className)}
      disabled={disabled || cargando}
      {...props}
    >
      {children}
      {cargando && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
      )}
    </button>
  );
}
