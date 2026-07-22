-- 012-captura-offline-campo
-- Metadatos de sincronización de captura offline sobre Inspeccion (certificación).
-- No se modifica inspeccion_detalle ni inspeccion_evidencia: la idempotencia de
-- sincronización reutiliza el upsert por (inspeccion_id, nodo_id) ya existente
-- desde 015-wizard-certificacion.

ALTER TABLE "inspeccion" ADD COLUMN "captura_offline" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inspeccion" ADD COLUMN "sincronizado_en" TIMESTAMP(3);

CREATE INDEX "inspeccion_empresa_id_captura_offline_idx" ON "inspeccion"("empresa_id", "captura_offline");
