-- 014-panel-calendario-biblioteca
-- Calendario de auditorías (plan_auditoria) y biblioteca de hallazgos frecuentes
-- (hallazgo_frecuente). El panel ejecutivo (HU-4) no agrega tabla nueva.

CREATE TABLE "plan_auditoria" (
    "id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "fecha_objetivo" DATE NOT NULL,
    "responsable_sugerido_id" TEXT,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA',
    "inspeccion_id" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresa_id" TEXT NOT NULL,

    CONSTRAINT "plan_auditoria_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plan_auditoria_inspeccion_id_key" ON "plan_auditoria"("inspeccion_id");

-- CreateIndex
CREATE INDEX "plan_auditoria_sucursal_id_fecha_objetivo_idx" ON "plan_auditoria"("sucursal_id", "fecha_objetivo");

-- CreateIndex
CREATE INDEX "plan_auditoria_empresa_id_estado_idx" ON "plan_auditoria"("empresa_id", "estado");

-- AddForeignKey
ALTER TABLE "plan_auditoria" ADD CONSTRAINT "plan_auditoria_sucursal_id_fkey"
    FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_auditoria" ADD CONSTRAINT "plan_auditoria_responsable_sugerido_id_fkey"
    FOREIGN KEY ("responsable_sugerido_id") REFERENCES "usuario"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_auditoria" ADD CONSTRAINT "plan_auditoria_inspeccion_id_fkey"
    FOREIGN KEY ("inspeccion_id") REFERENCES "inspeccion"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "hallazgo_frecuente" (
    "id" TEXT NOT NULL,
    "descripcion_hallazgo" VARCHAR(300) NOT NULL,
    "severidad_sugerida" VARCHAR(10) NOT NULL,
    "descripcion_accion_sugerida" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empresa_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hallazgo_frecuente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hallazgo_frecuente_empresa_id_activo_idx" ON "hallazgo_frecuente"("empresa_id", "activo");
