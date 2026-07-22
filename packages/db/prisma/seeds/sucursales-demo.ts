import type { PrismaClient } from "@prisma/client";

/**
 * No existe todavía un seed de clientes-demo.ts (sprint 002 no lo creó).
 * Este seed crea 2 clientes demo mínimos vía upsert idempotente antes de
 * sembrar sus sucursales, para no depender de un archivo inexistente.
 */
export async function sembrarSucursalesDemo(prisma: PrismaClient, empresaId: string) {
  const cliente1 = await prisma.cliente.upsert({
    where: { id: "10000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "10000000-0000-0000-0000-000000000001",
      empresaId,
      nombreResponsable: "Ana Rodríguez Mora",
      empresa: "Distribuidora Sur S.A.",
      identificacionEmpresa: "3-101-222333",
      correo1: "contacto@distsur.com",
      direccion: "San José, Costa Rica",
    },
  });

  const cliente2 = await prisma.cliente.upsert({
    where: { id: "10000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "10000000-0000-0000-0000-000000000002",
      empresaId,
      nombreResponsable: "Luis Fernández Castro",
      empresa: "Agroindustrias del Valle Ltda.",
      correo1: "info@agrovalle.com",
      direccion: "Alajuela, Costa Rica",
    },
  });

  await sembrarSucursal(prisma, cliente1.id, {
    nombre: "Planta Central",
    direccion: "San José, Costa Rica",
    correo: "pc@distsur.com",
    movil: "8888-0001",
  });

  await sembrarSucursal(prisma, cliente1.id, {
    nombre: "Sucursal Norte",
    direccion: "Alajuela, Costa Rica",
  });

  await sembrarSucursal(prisma, cliente2.id, {
    nombre: "Planta Frutas CR",
    direccion: "Alajuela, Costa Rica",
    correo: "planta@agrovalle.com",
  });

  console.log("✓ Sucursales demo creadas");
}

async function sembrarSucursal(
  prisma: PrismaClient,
  clienteId: string,
  datos: { nombre: string; direccion?: string; correo?: string; movil?: string },
) {
  const existente = await prisma.sucursal.findFirst({ where: { clienteId, nombre: datos.nombre } });
  if (existente) {
    await prisma.sucursal.update({ where: { id: existente.id }, data: datos });
    return existente;
  }
  const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id: clienteId } });
  return prisma.sucursal.create({ data: { ...datos, clienteId, empresaId: cliente.empresaId } });
}
