-- AlterTable: usuario.cliente_id (alcance de administrador_cliente)
ALTER TABLE "usuario" ADD COLUMN "cliente_id" TEXT;

-- CreateIndex
CREATE INDEX "usuario_empresa_id_cliente_id_idx" ON "usuario"("empresa_id", "cliente_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_cliente_id_fkey"
    FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
