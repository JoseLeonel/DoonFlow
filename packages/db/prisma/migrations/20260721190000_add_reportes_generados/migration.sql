-- 008-reportes-analytics
-- ReporteGenerado (historial de exportaciones Excel/PDF, no se borra) + índice de soporte
-- para las queries agregadas de reportes (rango de fechas por sucursal).

CREATE TYPE "TipoReporte" AS ENUM ('CONSOLIDADO_CLIENTE', 'COMPARATIVO_SUCURSALES');
CREATE TYPE "FormatoReporte" AS ENUM ('EXCEL', 'PDF');

CREATE TABLE "reporte_generado" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo" "TipoReporte" NOT NULL,
    "filtros" JSONB NOT NULL,
    "formato" "FormatoReporte" NOT NULL,
    "url" TEXT NOT NULL,
    "generado_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reporte_generado_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reporte_generado_empresa_id_creado_en_idx" ON "reporte_generado"("empresa_id", "creado_en" DESC);
CREATE INDEX "reporte_generado_empresa_id_tipo_idx" ON "reporte_generado"("empresa_id", "tipo");

ALTER TABLE "reporte_generado" ADD CONSTRAINT "reporte_generado_generado_por_id_fkey" FOREIGN KEY ("generado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "inspeccion_sucursal_id_fecha_inicio_idx" ON "inspeccion"("sucursal_id", "fecha_inicio");
