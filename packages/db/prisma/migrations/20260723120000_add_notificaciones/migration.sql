-- 006-vigencia-notificaciones-portal
-- Notificaciones in-app: recordatorio de vencimiento de certificación/acción correctiva,
-- escalamiento de acción vencida, hallazgo crítico, acción asignada. El portal público de
-- verificación no necesita tabla nueva (lee campos ya públicos de "inspeccion").

CREATE TABLE "notificacion" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "referencia_tipo" VARCHAR(20) NOT NULL,
    "referencia_id" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida_en" TIMESTAMP(3),
    "enviada_por_correo" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresa_id" TEXT NOT NULL,

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificacion_usuario_id_leida_en_idx" ON "notificacion"("usuario_id", "leida_en");

-- CreateIndex
CREATE INDEX "notificacion_empresa_id_creado_en_idx" ON "notificacion"("empresa_id", "creado_en");

-- CreateIndex (idempotencia del job diario — ver sp_notificacion_generar_vencimientos.sql)
CREATE INDEX "notificacion_referencia_tipo_referencia_id_tipo_creado_en_idx" ON "notificacion"("referencia_tipo", "referencia_id", "tipo", "creado_en");

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_empresa_id_fkey"
    FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
