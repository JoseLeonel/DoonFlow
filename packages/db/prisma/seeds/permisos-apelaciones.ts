import type { PrismaClient } from "@prisma/client";

const PERMISOS_NUEVOS = [
  { codigo: "apelaciones.resolver", descripcion: "Resolver apelaciones sobre hallazgos o el resultado de una certificación" },
];

/**
 * Siembra el catálogo de `Permiso` de 011-aceptacion-apelaciones-certificacion (upsert por
 * `codigo`). Mismo criterio que `sembrarPermisosGobernanza` (007): no crea filas `RolPermiso`
 * por defecto, ni siquiera para `auditor` — un administrador decide desde la matriz de
 * `/mantenimientos/roles` qué roles reciben el permiso. `administrador` ya lo tiene implícito
 * por regla de negocio (`esRolAdministrador`), sin necesitar fila explícita.
 */
export async function sembrarPermisosApelaciones(prisma: PrismaClient) {
  for (const permiso of PERMISOS_NUEVOS) {
    await prisma.permiso.upsert({
      where: { codigo: permiso.codigo },
      update: { descripcion: permiso.descripcion },
      create: permiso,
    });
  }
  console.log("✓ Permisos de apelaciones creados:", PERMISOS_NUEVOS.map((p) => p.codigo).join(", "));
}
