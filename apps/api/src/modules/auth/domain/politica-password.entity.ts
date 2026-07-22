/**
 * Valida la política mínima de contraseña (010-seguridad-privacidad-continuidad, HU-1):
 * al menos 8 caracteres, una mayúscula y un número. Se aplica siempre en el backend,
 * independiente de cualquier validación de frontend (regla de negocio 3 del spec).
 *
 * @param password - Contraseña en texto plano a validar (nunca se persiste así).
 * @returns `null` si cumple la política, o un mensaje descriptivo del primer requisito incumplido.
 * @example
 *   validarPoliticaPassword("Abcd1234")  // → null
 *   validarPoliticaPassword("abcd1234")  // → "La contraseña debe tener al menos una mayúscula."
 */
export function validarPoliticaPassword(password: string): string | null {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (!/[A-Z]/.test(password)) {
    return "La contraseña debe tener al menos una mayúscula.";
  }
  if (!/[0-9]/.test(password)) {
    return "La contraseña debe tener al menos un número.";
  }
  return null;
}
