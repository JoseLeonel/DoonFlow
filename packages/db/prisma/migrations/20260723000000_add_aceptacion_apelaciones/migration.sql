-- 011-aceptacion-apelaciones-certificacion
-- Aceptación informativa del cliente sobre una certificación firmada, y apelaciones sobre un
-- hallazgo puntual o sobre el resultado final, con resolución por un auditor/administrador
-- distinto de quien firmó (separación de funciones).

-- AlterTable: inspeccion (aceptación del cliente)
ALTER TABLE "inspeccion" ADD COLUMN "aceptado_por_cliente_id" TEXT;
ALTER TABLE "inspeccion" ADD COLUMN "aceptado_en" TIMESTAMP(3);

ALTER TABLE "inspeccion" ADD CONSTRAINT "inspeccion_aceptado_por_cliente_id_fkey"
    FOREIGN KEY ("aceptado_por_cliente_id") REFERENCES "usuario"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: hallazgo (estado, separado de severidad)
ALTER TABLE "hallazgo" ADD COLUMN "estado" VARCHAR(30) NOT NULL DEFAULT 'ACTIVO';

-- CreateTable: apelacion
CREATE TABLE "apelacion" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "inspeccion_id" TEXT NOT NULL,
    "hallazgo_id" TEXT,
    "tipo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "solicitado_por_id" TEXT NOT NULL,
    "solicitado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "resuelto_por_id" TEXT,
    "resuelto_en" TIMESTAMP(3),
    "resolucion_comentario" TEXT,

    CONSTRAINT "apelacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apelacion_empresa_id_estado_idx" ON "apelacion"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX "apelacion_inspeccion_id_idx" ON "apelacion"("inspeccion_id");

-- CreateIndex
CREATE INDEX "apelacion_hallazgo_id_idx" ON "apelacion"("hallazgo_id");

-- AddForeignKey
ALTER TABLE "apelacion" ADD CONSTRAINT "apelacion_inspeccion_id_fkey"
    FOREIGN KEY ("inspeccion_id") REFERENCES "inspeccion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apelacion" ADD CONSTRAINT "apelacion_hallazgo_id_fkey"
    FOREIGN KEY ("hallazgo_id") REFERENCES "hallazgo"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apelacion" ADD CONSTRAINT "apelacion_solicitado_por_id_fkey"
    FOREIGN KEY ("solicitado_por_id") REFERENCES "usuario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apelacion" ADD CONSTRAINT "apelacion_resuelto_por_id_fkey"
    FOREIGN KEY ("resuelto_por_id") REFERENCES "usuario"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
