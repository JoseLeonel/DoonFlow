import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind resolviendo conflictos (clsx + tailwind-merge).
 * Patrón portado de la plantilla `nextjs-admin-dashboard-main`.
 */
export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas));
}
