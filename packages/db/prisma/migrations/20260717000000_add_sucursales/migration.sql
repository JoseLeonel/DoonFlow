-- AlterTable: cliente.movil
ALTER TABLE "cliente" ADD COLUMN "movil" VARCHAR(20);

-- CreateTable: sucursal
CREATE TABLE "sucursal" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "direccion" VARCHAR(300),
    "correo" VARCHAR(150),
    "movil" VARCHAR(20),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sucursal_empresa_id_cliente_id_activo_idx" ON "sucursal"("empresa_id", "cliente_id", "activo");

-- AddForeignKey
ALTER TABLE "sucursal" ADD CONSTRAINT "sucursal_cliente_id_fkey"
    FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: usuario.sucursal_id (sucursal principal, NULL para roles de alcance total)
ALTER TABLE "usuario" ADD COLUMN "sucursal_id" TEXT;

-- CreateIndex
CREATE INDEX "usuario_sucursal_id_idx" ON "usuario"("sucursal_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_sucursal_id_fkey"
    FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: usuario_sucursal_acceso (sucursales adicionales de consulta)
CREATE TABLE "usuario_sucursal_acceso" (
    "usuario_id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_sucursal_acceso_pkey" PRIMARY KEY ("usuario_id","sucursal_id")
);

-- AddForeignKey
ALTER TABLE "usuario_sucursal_acceso" ADD CONSTRAINT "usuario_sucursal_acceso_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_sucursal_acceso" ADD CONSTRAINT "usuario_sucursal_acceso_sucursal_id_fkey"
    FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: inspeccion.sucursal_id (columna preparatoria — sin lógica de aplicación en este sprint, ver RF-08)
ALTER TABLE "inspeccion" ADD COLUMN "sucursal_id" TEXT;

-- CreateIndex
CREATE INDEX "inspeccion_sucursal_id_idx" ON "inspeccion"("sucursal_id");

-- AddForeignKey
ALTER TABLE "inspeccion" ADD CONSTRAINT "inspeccion_sucursal_id_fkey"
    FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
