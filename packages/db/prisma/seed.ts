import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLES_SISTEMA } from "@doonflow/shared";

const prisma = new PrismaClient();

const DESCRIPCION_ROL: Record<string, string> = {
  administrador:   "Acceso total a la empresa y su configuración.",
  productor:       "Gestiona fincas, lotes, cultivos e inventario propio.",
  operario:        "Registra operaciones de campo y movimientos de inventario.",
  auditor:         "Acceso de solo lectura para revisión y trazabilidad.",
  cliente_externo: "Acceso limitado a trazabilidad de sus propios pedidos.",
};

async function main() {
  // Roles fijos del sistema
  for (const nombre of ROLES_SISTEMA) {
    await prisma.rol.upsert({
      where:  { nombre },
      update: {},
      create: { nombre, descripcion: DESCRIPCION_ROL[nombre] },
    });
  }
  console.log("✓ Roles creados:", ROLES_SISTEMA.join(", "));

  // Empresa demo
  const empresaDemo = await prisma.empresa.upsert({
    where:  { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: { id: "00000000-0000-0000-0000-000000000001", nombre: "Finca Demo DoonFlow" },
  });
  console.log("✓ Empresa demo:", empresaDemo.nombre);

  // Usuario administrador demo con contraseña hasheada para desarrollo local
  const rolAdmin = await prisma.rol.findUniqueOrThrow({ where: { nombre: "administrador" } });
  const passwordHash = await bcrypt.hash("Admin2026!", 12);

  const usuario = await prisma.usuario.upsert({
    where:  { email: "admin@doonflow.demo" },
    update: { passwordHash },
    create: {
      empresaId:    empresaDemo.id,
      email:        "admin@doonflow.demo",
      nombre:       "Administrador Demo",
      rolId:        rolAdmin.id,
      passwordHash,
    },
  });
  console.log("✓ Usuario demo creado:", usuario.email);
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Credenciales de acceso (modo local)");
  console.log("  Email:     admin@doonflow.demo");
  console.log("  Contraseña: Admin2026!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
