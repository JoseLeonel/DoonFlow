-- CreateEnum
CREATE TYPE "EstadoAprobacionPlantilla" AS ENUM ('BORRADOR', 'EN_REVISION', 'APROBADA', 'RECHAZADA');

-- AlterTable: flujo de aprobación de 007-gobernanza-permisos-aprobacion
ALTER TABLE "inspeccion_plantilla"
  ADD COLUMN "estado_aprobacion" "EstadoAprobacionPlantilla" NOT NULL DEFAULT 'BORRADOR',
  ADD COLUMN "solicitado_por_id" TEXT,
  ADD COLUMN "solicitado_en" TIMESTAMP(3),
  ADD COLUMN "aprobador_id" TEXT,
  ADD COLUMN "resuelto_en" TIMESTAMP(3),
  ADD COLUMN "comentario_resolucion" TEXT;

-- CreateIndex
CREATE INDEX "inspeccion_plantilla_empresa_id_estado_aprobacion_idx" ON "inspeccion_plantilla"("empresa_id", "estado_aprobacion");

-- AddForeignKey
ALTER TABLE "inspeccion_plantilla" ADD CONSTRAINT "inspeccion_plantilla_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_plantilla" ADD CONSTRAINT "inspeccion_plantilla_aprobador_id_fkey" FOREIGN KEY ("aprobador_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
