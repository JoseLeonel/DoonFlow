-- 009-integraciones-datos-masivos, HU-3
-- Claves de integración programática por empresa tenant, para la API pública de verificación.

CREATE TABLE "api_key" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "clave_hash" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_uso_en" TIMESTAMP(3),
    "creado_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "api_key_clave_hash_key" ON "api_key"("clave_hash");

-- CreateIndex
CREATE INDEX "api_key_empresa_id_activa_idx" ON "api_key"("empresa_id", "activa");

-- AddForeignKey
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_empresa_id_fkey"
    FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_creado_por_id_fkey"
    FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
