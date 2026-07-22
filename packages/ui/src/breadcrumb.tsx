import * as React from "react";
import Link from "next/link";
import { cn } from "@doonflow/shared";

export interface SegmentoBreadcrumb {
  /** Texto visible del segmento. */
  label: string;
  /** Ruta de navegación. Si se omite, el segmento se renderiza como texto plano (página actual). */
  href?: string;
}

export interface PropsBreadcrumb {
  /** Array ordenado de segmentos. El último debe omitir `href` (página actual). */
  segmentos: SegmentoBreadcrumb[];
  className?: string;
}

/**
 * Breadcrumb de navegación reutilizable.
 * Los segmentos con `href` renderizan un enlace; el último segmento (sin `href`) solo texto.
 *
 * @example
 *   <Breadcrumb segmentos={[
 *     { label: "Inspecciones", href: "/inspecciones" },
 *     { label: "Ficha Ministerio 2026", href: "/inspecciones/abc" },
 *     { label: "Estructura" },
 *   ]} />
 */
export function Breadcrumb({ segmentos, className }: PropsBreadcrumb) {
  return (
    <nav aria-label="Ruta de navegación" className={cn("flex items-center gap-1.5 text-body-sm", className)}>
      {segmentos.map((seg, idx) => {
        const esUltimo = idx === segmentos.length - 1;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <span className="text-dark-5 dark:text-dark-6" aria-hidden="true">/</span>
            )}
            {seg.href && !esUltimo ? (
              <Link
                href={seg.href}
                className="text-dark-4 hover:text-primary dark:text-dark-6 dark:hover:text-primary transition-colors"
              >
                {seg.label}
              </Link>
            ) : (
              <span
                className={cn(
                  esUltimo
                    ? "font-medium text-dark dark:text-white"
                    : "text-dark-4 dark:text-dark-6",
                )}
                aria-current={esUltimo ? "page" : undefined}
              >
                {seg.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
