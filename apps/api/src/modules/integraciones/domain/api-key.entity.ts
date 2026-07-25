import { randomBytes, createHash } from "node:crypto";

/**
 * ApiKey — clave de integración programática de una empresa tenant (009-integraciones-datos-masivos,
 * HU-3). Sin dependencias de Express/Prisma.
 */
export interface ApiKey {
  id: string;
  empresaId: string;
  nombre: string;
  claveHash: string;
  activa: boolean;
  ultimoUsoEn: Date | null;
  creadoPorId: string;
  creadoEn: Date;
}

/**
 * Genera una clave nueva en texto plano, con un prefijo identificable (no secreto) para
 * distinguirla a simple vista de otros tokens — mismo criterio que APIs públicas conocidas
 * (Stripe/GitHub prefijan sus tokens).
 *
 * @returns Clave en texto plano — se muestra una sola vez, nunca se persiste así (regla 3 de la spec).
 * @example
 *   generarClave() // → "dnf_live_3f9a1c...b2" (66 caracteres)
 */
export function generarClave(): string {
  return `dnf_live_${randomBytes(32).toString("hex")}`;
}

/**
 * Calcula el hash SHA-256 de una clave en texto plano — lo único que se persiste en BD.
 * SHA-256 (no bcrypt) porque la clave ya es de alta entropía (256 bits aleatorios): a diferencia
 * de una contraseña de usuario, no necesita un hash lento con salt para resistir fuerza bruta.
 *
 * @param clave - Clave en texto plano.
 * @returns Hash hexadecimal de 64 caracteres.
 * @example
 *   hashClave("dnf_live_abc123") // → "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a1..."
 */
export function hashClave(clave: string): string {
  return createHash("sha256").update(clave).digest("hex");
}

/**
 * Indica si una API key puede usarse para autenticar una request.
 *
 * @param apiKey - Registro con su estado `activa`.
 * @returns `true` si la key no ha sido revocada.
 * @example
 *   estaActiva({ activa: true } as ApiKey)  // → true
 *   estaActiva({ activa: false } as ApiKey) // → false
 */
export function estaActiva(apiKey: Pick<ApiKey, "activa">): boolean {
  return apiKey.activa;
}
