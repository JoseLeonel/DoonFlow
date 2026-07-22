-- 005-certificacion-plan-cumplimiento (retomado 2026-07-21)
-- Campos de firma/certificación sobre Inspeccion — HU-2: firmar/confirmar la certificación,
-- generar código de verificación único y PDF. `resultado_final` se fija en 'APROBADA' de forma
-- incondicional (no existe todavía el concepto de Hallazgo; 013-hallazgos-plan-cumplimiento
-- reemplazaría el cálculo real por severidad cuando se implemente).

ALTER TABLE "inspeccion" ADD COLUMN "firmado_por_id" TEXT;
ALTER TABLE "inspeccion" ADD COLUMN "firmado_en" TIMESTAMP(3);
ALTER TABLE "inspeccion" ADD COLUMN "codigo_verificacion" VARCHAR(20);
ALTER TABLE "inspeccion" ADD COLUMN "pdf_url" TEXT;
ALTER TABLE "inspeccion" ADD COLUMN "fecha_vencimiento" DATE;
ALTER TABLE "inspeccion" ADD COLUMN "resultado_final" VARCHAR(30);

-- Único en todo el sistema (no solo por empresa) — regla de negocio 1 del spec.
CREATE UNIQUE INDEX "inspeccion_codigo_verificacion_key" ON "inspeccion"("codigo_verificacion");

ALTER TABLE "inspeccion" ADD CONSTRAINT "inspeccion_firmado_por_id_fkey"
  FOREIGN KEY ("firmado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
