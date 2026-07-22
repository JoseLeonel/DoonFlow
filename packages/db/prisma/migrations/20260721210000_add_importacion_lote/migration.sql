-- 009-integraciones-datos-masivos (alcance reducido: solo HU-1/HU-2, importación masiva)
-- ImportacionLote — trazabilidad de cargas masivas de Cliente/Sucursal.
-- Sin tabla api_key en esta migración: HU-3 (API keys + verificación pública)
-- queda pospuesta, ver memoria/decisiones.md 2026-07-21.

CREATE TYPE "TipoImportacion" AS ENUM ('CLIENTE', 'SUCURSAL');

CREATE TABLE "importacion_lote" (
    "id" TEXT NOT NULL,
    "tipo" "TipoImportacion" NOT NULL,
    "archivo_nombre" VARCHAR(255) NOT NULL,
    "total_filas" INTEGER NOT NULL,
    "filas_exitosas" INTEGER NOT NULL,
    "filas_con_error" INTEGER NOT NULL,
    "detalle_errores" JSONB,
    "creado_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresa_id" TEXT NOT NULL,

    CONSTRAINT "importacion_lote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "importacion_lote_empresa_id_tipo_creado_en_idx" ON "importacion_lote"("empresa_id", "tipo", "creado_en");

ALTER TABLE "importacion_lote" ADD CONSTRAINT "importacion_lote_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
