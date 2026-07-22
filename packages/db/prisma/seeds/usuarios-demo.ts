import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Depende de sembrarSucursalesDemo (clientes/sucursales demo) — debe correr después.
 * 1 usuario administrador_cliente ligado al Cliente 1 ("Distribuidora Sur S.A.").
 * 1 usuario usuario_sucursal ligado a la sucursal "Planta Central" de ese mismo cliente.
 */
export async function sembrarUsuariosDemo(prisma: PrismaClient, empresaId: string) {
  const cliente1 = await prisma.cliente.findFirst({ where: { empresaId, empresa: "Distribuidora Sur S.A." } });
  if (!cliente1) {
    console.warn("⚠ sembrarUsuariosDemo: no se encontró el cliente demo, se omite este seed.");
    return;
  }

  const sucursalPlantaCentral = await prisma.sucursal.findFirst({
    where: { clienteId: cliente1.id, nombre: "Planta Central" },
  });

  const rolAdministradorCliente = await prisma.rol.findUniqueOrThrow({ where: { nombre: "administrador_cliente" } });
  const rolUsuarioSucursal = await prisma.rol.findUniqueOrThrow({ where: { nombre: "usuario_sucursal" } });

  const passwordHash = await bcrypt.hash("Cliente2026!", 12);

  await prisma.usuario.upsert({
    where: { email: "carlos@dist.com" },
    update: { passwordHash, clienteId: cliente1.id, rolId: rolAdministradorCliente.id },
    create: {
      empresaId,
      email: "carlos@dist.com",
      nombre: "Carlos Mora",
      rolId: rolAdministradorCliente.id,
      passwordHash,
      clienteId: cliente1.id,
    },
  });

  await prisma.usuario.upsert({
    where: { email: "lucia@dist.com" },
    update: { passwordHash, sucursalId: sucursalPlantaCentral?.id ?? null, rolId: rolUsuarioSucursal.id },
    create: {
      empresaId,
      email: "lucia@dist.com",
      nombre: "Lucía Vindas",
      rolId: rolUsuarioSucursal.id,
      passwordHash,
      sucursalId: sucursalPlantaCentral?.id ?? null,
    },
  });

  console.log("✓ Usuarios demo de alcance creados: carlos@dist.com (administrador_cliente), lucia@dist.com (usuario_sucursal)");
}
