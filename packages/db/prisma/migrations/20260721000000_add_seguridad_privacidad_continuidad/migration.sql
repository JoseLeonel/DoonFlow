-- 010-seguridad-privacidad-continuidad
-- RegistroAuditoria (append-only), PoliticaRetencion, AvisoPrivacidad + índices de paginación.

CREATE TABLE "registro_auditoria" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "accion" VARCHAR(50) NOT NULL,
    "entidad_tipo" VARCHAR(50) NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "valor_antes" JSONB,
    "valor_despues" JSONB,
    "ip" VARCHAR(45),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_auditoria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "registro_auditoria_empresa_id_accion_creado_en_idx" ON "registro_auditoria"("empresa_id", "accion", "creado_en" DESC);
CREATE INDEX "registro_auditoria_usuario_id_idx" ON "registro_auditoria"("usuario_id");
CREATE INDEX "registro_auditoria_entidad_tipo_entidad_id_idx" ON "registro_auditoria"("entidad_tipo", "entidad_id");

ALTER TABLE "registro_auditoria" ADD CONSTRAINT "registro_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "politica_retencion" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo_dato" VARCHAR(30) NOT NULL,
    "meses_retencion" INTEGER NOT NULL,
    "accion_al_vencer" VARCHAR(20) NOT NULL,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "politica_retencion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "politica_retencion_empresa_id_tipo_dato_key" ON "politica_retencion"("empresa_id", "tipo_dato");

CREATE TABLE "aviso_privacidad" (
    "id" TEXT NOT NULL,
    "entidad_tipo" VARCHAR(20) NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "base_legal" TEXT NOT NULL,
    "registrado_por_id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aviso_privacidad_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "aviso_privacidad_entidad_tipo_entidad_id_idx" ON "aviso_privacidad"("entidad_tipo", "entidad_id");

ALTER TABLE "aviso_privacidad" ADD CONSTRAINT "aviso_privacidad_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Índices de paginación server-side (T-423)
CREATE INDEX "cliente_empresa_id_creado_en_idx" ON "cliente"("empresa_id", "creado_en");
CREATE INDEX "inspeccion_empresa_id_sucursal_id_estado_creado_en_idx" ON "inspeccion"("empresa_id", "sucursal_id", "estado", "creado_en");
