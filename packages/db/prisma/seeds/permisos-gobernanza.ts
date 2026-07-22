import type { PrismaClient } from "@prisma/client";

const PERMISOS_NUEVOS = [
  { codigo: "plantillas.enviar_revision", descripcion: "Enviar una plantilla de ficha a revisión" },
  { codigo: "plantillas.aprobar", descripcion: "Aprobar o rechazar una plantilla en revisión" },
  { codigo: "permisos.administrar", descripcion: "Editar la matriz de permisos por rol" },
];

/**
 * Siembra el catálogo de `Permiso` de 007-gobernanza-permisos-aprobacion (upsert por `codigo`).
 * No crea filas `RolPermiso` por defecto — ni siquiera para `administrador`, que los tiene
 * implícitos por regla de negocio (`esRolAdministrador`) sin necesitar fila explícita. Un
 * administrador humano decide desde la matriz qué otros roles reciben cada permiso.
 */
export async function sembrarPermisosGobernanza(prisma: PrismaClient) {
  for (const permiso of PERMISOS_NUEVOS) {
    await prisma.permiso.upsert({
      where: { codigo: permiso.codigo },
      update: { descripcion: permiso.descripcion },
      create: permiso,
    });
  }
  console.log("✓ Permisos de gobernanza creados:", PERMISOS_NUEVOS.map((p) => p.codigo).join(", "));
}
