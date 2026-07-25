-- Reemplaza `periodo_etiqueta` (texto libre) por un rango de fechas real para el período
-- auditado por la certificación. `periodo_etiqueta` se conserva (deprecated) por historial de
-- certificaciones creadas antes de este cambio; el código nuevo ya no la escribe.
ALTER TABLE "inspeccion"
  ADD COLUMN "fecha_inicio_periodo" DATE,
  ADD COLUMN "fecha_fin_periodo" DATE;

CREATE INDEX "inspeccion_sucursal_id_plantilla_id_fecha_fin_periodo_idx"
  ON "inspeccion" ("sucursal_id", "plantilla_id", "fecha_fin_periodo");
