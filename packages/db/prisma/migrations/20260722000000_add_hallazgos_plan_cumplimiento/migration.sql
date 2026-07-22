-- 013-hallazgos-plan-cumplimiento
-- Hallazgos, plan de cumplimiento y acciones correctivas sobre una certificación ya firmada
-- (o en progreso) por 005-certificacion-plan-cumplimiento.

-- CreateTable: hallazgo
CREATE TABLE "hallazgo" (
    "id" TEXT NOT NULL,
    "inspeccion_id" TEXT NOT NULL,
    "detalle_id" TEXT,
    "descripcion" TEXT NOT NULL,
    "severidad" VARCHAR(20) NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hallazgo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hallazgo_inspeccion_id_idx" ON "hallazgo"("inspeccion_id");

-- CreateIndex
CREATE INDEX "hallazgo_empresa_id_severidad_idx" ON "hallazgo"("empresa_id", "severidad");

-- AddForeignKey
ALTER TABLE "hallazgo" ADD CONSTRAINT "hallazgo_inspeccion_id_fkey"
    FOREIGN KEY ("inspeccion_id") REFERENCES "inspeccion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hallazgo" ADD CONSTRAINT "hallazgo_detalle_id_fkey"
    FOREIGN KEY ("detalle_id") REFERENCES "inspeccion_detalle"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: hallazgo_evidencia
CREATE TABLE "hallazgo_evidencia" (
    "id" TEXT NOT NULL,
    "hallazgo_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tamano_bytes" INTEGER,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hallazgo_evidencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hallazgo_evidencia_hallazgo_id_idx" ON "hallazgo_evidencia"("hallazgo_id");

-- AddForeignKey
ALTER TABLE "hallazgo_evidencia" ADD CONSTRAINT "hallazgo_evidencia_hallazgo_id_fkey"
    FOREIGN KEY ("hallazgo_id") REFERENCES "hallazgo"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: plan_cumplimiento
CREATE TABLE "plan_cumplimiento" (
    "id" TEXT NOT NULL,
    "inspeccion_id" TEXT NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'EN_SEGUIMIENTO',
    "cerrado_por_id" TEXT,
    "cerrado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_cumplimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_cumplimiento_inspeccion_id_key" ON "plan_cumplimiento"("inspeccion_id");

-- AddForeignKey
ALTER TABLE "plan_cumplimiento" ADD CONSTRAINT "plan_cumplimiento_inspeccion_id_fkey"
    FOREIGN KEY ("inspeccion_id") REFERENCES "inspeccion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_cumplimiento" ADD CONSTRAINT "plan_cumplimiento_cerrado_por_id_fkey"
    FOREIGN KEY ("cerrado_por_id") REFERENCES "usuario"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: accion_correctiva
CREATE TABLE "accion_correctiva" (
    "id" TEXT NOT NULL,
    "plan_cumplimiento_id" TEXT NOT NULL,
    "hallazgo_id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "responsable_id" TEXT NOT NULL,
    "fecha_limite" DATE NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "porcentaje_avance" INTEGER NOT NULL DEFAULT 0,
    "verificado_por_id" TEXT,
    "verificado_en" TIMESTAMP(3),
    "comentario_verificacion" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accion_correctiva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accion_correctiva_plan_cumplimiento_id_idx" ON "accion_correctiva"("plan_cumplimiento_id");

-- CreateIndex
CREATE INDEX "accion_correctiva_hallazgo_id_idx" ON "accion_correctiva"("hallazgo_id");

-- CreateIndex
CREATE INDEX "accion_correctiva_responsable_id_estado_idx" ON "accion_correctiva"("responsable_id", "estado");

-- CreateIndex
CREATE INDEX "accion_correctiva_fecha_limite_idx" ON "accion_correctiva"("fecha_limite");

-- AddForeignKey
ALTER TABLE "accion_correctiva" ADD CONSTRAINT "accion_correctiva_plan_cumplimiento_id_fkey"
    FOREIGN KEY ("plan_cumplimiento_id") REFERENCES "plan_cumplimiento"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accion_correctiva" ADD CONSTRAINT "accion_correctiva_hallazgo_id_fkey"
    FOREIGN KEY ("hallazgo_id") REFERENCES "hallazgo"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accion_correctiva" ADD CONSTRAINT "accion_correctiva_responsable_id_fkey"
    FOREIGN KEY ("responsable_id") REFERENCES "usuario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accion_correctiva" ADD CONSTRAINT "accion_correctiva_verificado_por_id_fkey"
    FOREIGN KEY ("verificado_por_id") REFERENCES "usuario"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: accion_correctiva_evidencia
CREATE TABLE "accion_correctiva_evidencia" (
    "id" TEXT NOT NULL,
    "accion_correctiva_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "comentario" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accion_correctiva_evidencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accion_correctiva_evidencia_accion_correctiva_id_idx" ON "accion_correctiva_evidencia"("accion_correctiva_id");

-- AddForeignKey
ALTER TABLE "accion_correctiva_evidencia" ADD CONSTRAINT "accion_correctiva_evidencia_accion_correctiva_id_fkey"
    FOREIGN KEY ("accion_correctiva_id") REFERENCES "accion_correctiva"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
