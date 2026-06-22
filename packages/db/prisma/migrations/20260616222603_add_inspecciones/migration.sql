-- CreateEnum
CREATE TYPE "TipoInspeccion" AS ENUM ('MINISTERIO_SALUD', 'AUDITORIA_INTERNA', 'CALIDAD', 'SEGURIDAD_OCUPACIONAL', 'SUPERVISION_OPERATIVA', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoRespuesta" AS ENUM ('SI_NO', 'SELECCION_UNICA', 'SELECCION_MULTIPLE', 'TEXTO_LIBRE', 'NUMERICO', 'PUNTAJE_MANUAL');

-- CreateEnum
CREATE TYPE "ModalidadPuntaje" AS ENUM ('FIJO', 'PARCIAL', 'MANUAL', 'POR_OPCIONES');

-- CreateEnum
CREATE TYPE "ReglaComentario" AS ENUM ('NUNCA', 'SIEMPRE', 'CUANDO_NEGATIVO', 'CUANDO_PUNTAJE_MENOR_MAXIMO', 'CONFIGURABLE');

-- CreateTable
CREATE TABLE "inspeccion_plantilla" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoInspeccion" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "puntaje_maximo" DECIMAL(8,2) NOT NULL DEFAULT 100,
    "fecha_vigencia" DATE,
    "observaciones" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    "creado_por_id" TEXT,

    CONSTRAINT "inspeccion_plantilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspeccion_apartado" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "plantilla_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "puntaje_maximo" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspeccion_apartado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspeccion_subapartado" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "apartado_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspeccion_subapartado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspeccion_pregunta" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "subapartado_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "tipo_respuesta" "TipoRespuesta" NOT NULL,
    "modalidad_puntaje" "ModalidadPuntaje" NOT NULL,
    "puntaje_maximo" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "regla_comentario" "ReglaComentario" NOT NULL DEFAULT 'NUNCA',
    "umbral_comentario" DECIMAL(8,2),
    "evidencia_obligatoria" BOOLEAN NOT NULL DEFAULT false,
    "evidencia_minima" INTEGER NOT NULL DEFAULT 0,
    "evidencia_maxima" INTEGER NOT NULL DEFAULT 5,
    "evidencia_tipos" TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspeccion_pregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspeccion_opcion_respuesta" (
    "id" TEXT NOT NULL,
    "pregunta_id" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "puntaje" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspeccion_opcion_respuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspeccion_regla_puntaje" (
    "id" TEXT NOT NULL,
    "pregunta_id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "umbral_desde" DECIMAL(5,2) NOT NULL,
    "umbral_hasta" DECIMAL(5,2) NOT NULL,
    "puntaje" DECIMAL(8,2) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspeccion_regla_puntaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspeccion_rango_resultado" (
    "id" TEXT NOT NULL,
    "plantilla_id" TEXT NOT NULL,
    "desde" DECIMAL(5,2) NOT NULL,
    "hasta" DECIMAL(5,2) NOT NULL,
    "clasificacion" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspeccion_rango_resultado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspeccion" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "plantilla_id" TEXT NOT NULL,
    "plantilla_version" INTEGER NOT NULL,
    "inspector_id" TEXT NOT NULL,
    "establecimiento" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'EN_PROGRESO',
    "puntaje_obtenido" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "puntaje_maximo" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "porcentaje_cumplimiento" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "clasificacion" TEXT,
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspeccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspeccion_detalle" (
    "id" TEXT NOT NULL,
    "inspeccion_id" TEXT NOT NULL,
    "pregunta_id" TEXT NOT NULL,
    "apartado_codigo" TEXT NOT NULL,
    "apartado_nombre" TEXT NOT NULL,
    "subapartado_codigo" TEXT NOT NULL,
    "subapartado_nombre" TEXT NOT NULL,
    "pregunta_codigo" TEXT NOT NULL,
    "pregunta_descripcion" TEXT NOT NULL,
    "tipo_respuesta" TEXT NOT NULL,
    "respuesta_valor" TEXT,
    "respuestas_multiples" TEXT[],
    "puntaje_obtenido" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "puntaje_maximo" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "comentario" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspeccion_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspeccion_evidencia" (
    "id" TEXT NOT NULL,
    "inspeccion_id" TEXT NOT NULL,
    "detalle_id" TEXT,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tamaño_bytes" INTEGER,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspeccion_evidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspeccion_reinspeccion" (
    "id" TEXT NOT NULL,
    "inspeccion_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "inspector_id" TEXT NOT NULL,
    "comentarios" TEXT,
    "puntaje_obtenido" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "porcentaje_cumplimiento" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspeccion_reinspeccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspeccion_auditoria" (
    "id" TEXT NOT NULL,
    "plantilla_id" TEXT,
    "usuario_id" TEXT NOT NULL,
    "tabla" TEXT NOT NULL,
    "registro_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "valor_antes" JSONB,
    "valor_despues" JSONB,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspeccion_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inspeccion_plantilla_empresa_id_activa_idx" ON "inspeccion_plantilla"("empresa_id", "activa");

-- CreateIndex
CREATE INDEX "inspeccion_apartado_plantilla_id_orden_idx" ON "inspeccion_apartado"("plantilla_id", "orden");

-- CreateIndex
CREATE INDEX "inspeccion_subapartado_apartado_id_orden_idx" ON "inspeccion_subapartado"("apartado_id", "orden");

-- CreateIndex
CREATE INDEX "inspeccion_pregunta_subapartado_id_orden_idx" ON "inspeccion_pregunta"("subapartado_id", "orden");

-- CreateIndex
CREATE INDEX "inspeccion_opcion_respuesta_pregunta_id_orden_idx" ON "inspeccion_opcion_respuesta"("pregunta_id", "orden");

-- CreateIndex
CREATE INDEX "inspeccion_rango_resultado_plantilla_id_idx" ON "inspeccion_rango_resultado"("plantilla_id");

-- CreateIndex
CREATE INDEX "inspeccion_empresa_id_estado_idx" ON "inspeccion"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX "inspeccion_plantilla_id_idx" ON "inspeccion"("plantilla_id");

-- CreateIndex
CREATE INDEX "inspeccion_detalle_inspeccion_id_idx" ON "inspeccion_detalle"("inspeccion_id");

-- CreateIndex
CREATE INDEX "inspeccion_evidencia_inspeccion_id_idx" ON "inspeccion_evidencia"("inspeccion_id");

-- CreateIndex
CREATE INDEX "inspeccion_reinspeccion_inspeccion_id_idx" ON "inspeccion_reinspeccion"("inspeccion_id");

-- CreateIndex
CREATE INDEX "inspeccion_auditoria_plantilla_id_idx" ON "inspeccion_auditoria"("plantilla_id");

-- CreateIndex
CREATE INDEX "inspeccion_auditoria_usuario_id_idx" ON "inspeccion_auditoria"("usuario_id");

-- AddForeignKey
ALTER TABLE "inspeccion_apartado" ADD CONSTRAINT "inspeccion_apartado_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "inspeccion_plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_subapartado" ADD CONSTRAINT "inspeccion_subapartado_apartado_id_fkey" FOREIGN KEY ("apartado_id") REFERENCES "inspeccion_apartado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_pregunta" ADD CONSTRAINT "inspeccion_pregunta_subapartado_id_fkey" FOREIGN KEY ("subapartado_id") REFERENCES "inspeccion_subapartado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_opcion_respuesta" ADD CONSTRAINT "inspeccion_opcion_respuesta_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "inspeccion_pregunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_regla_puntaje" ADD CONSTRAINT "inspeccion_regla_puntaje_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "inspeccion_pregunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_rango_resultado" ADD CONSTRAINT "inspeccion_rango_resultado_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "inspeccion_plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion" ADD CONSTRAINT "inspeccion_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "inspeccion_plantilla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_detalle" ADD CONSTRAINT "inspeccion_detalle_inspeccion_id_fkey" FOREIGN KEY ("inspeccion_id") REFERENCES "inspeccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_detalle" ADD CONSTRAINT "inspeccion_detalle_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "inspeccion_pregunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_evidencia" ADD CONSTRAINT "inspeccion_evidencia_inspeccion_id_fkey" FOREIGN KEY ("inspeccion_id") REFERENCES "inspeccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_evidencia" ADD CONSTRAINT "inspeccion_evidencia_detalle_id_fkey" FOREIGN KEY ("detalle_id") REFERENCES "inspeccion_detalle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_reinspeccion" ADD CONSTRAINT "inspeccion_reinspeccion_inspeccion_id_fkey" FOREIGN KEY ("inspeccion_id") REFERENCES "inspeccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_auditoria" ADD CONSTRAINT "inspeccion_auditoria_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "inspeccion_plantilla"("id") ON DELETE SET NULL ON UPDATE CASCADE;
