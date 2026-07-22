-- CreateTable
CREATE TABLE "cliente" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre_responsable" VARCHAR(200) NOT NULL,
    "empresa" VARCHAR(200) NOT NULL,
    "identificacion_empresa" VARCHAR(50),
    "correo1" VARCHAR(150) NOT NULL,
    "correo2" VARCHAR(150),
    "correo3" VARCHAR(150),
    "direccion" VARCHAR(300),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cliente_empresa_id_activo_idx" ON "cliente"("empresa_id", "activo");

-- CreateIndex (único parcial — solo aplica cuando identificacion_empresa no es NULL)
CREATE UNIQUE INDEX "cliente_empresa_id_identificacion_empresa_key"
    ON "cliente"("empresa_id", "identificacion_empresa")
    WHERE "identificacion_empresa" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_empresa_id_fkey"
    FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
