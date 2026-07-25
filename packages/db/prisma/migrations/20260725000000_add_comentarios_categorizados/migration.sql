-- Adapta la captura de comentarios de la certificación al pedido real del cliente (revisión de
-- audios WhatsApp 2026-06-03/04): en vez de un único comentario condicional por pregunta
-- (regla_comentario: NUNCA/SIEMPRE/CUANDO_NEGATIVO/...), cada pregunta expone 3 comentarios
-- siempre visibles (reconocimiento, observación, oportunidad de mejora), sin importar si la
-- respuesta es Sí o No. Reemplaza por completo el sistema anterior — no coexisten.

-- ── inspeccion_nodo: quitar la configuración de nota condicional (obsoleta) ─────────────────
ALTER TABLE "inspeccion_nodo" DROP COLUMN "regla_comentario";
ALTER TABLE "inspeccion_nodo" DROP COLUMN "umbral_comentario";
DROP TYPE "ReglaComentario";

-- ── inspeccion_detalle: comentario único → 3 comentarios categorizados, sin límite de BD ────
ALTER TABLE "inspeccion_detalle" DROP COLUMN "comentario";
ALTER TABLE "inspeccion_detalle" ADD COLUMN "comentario_reconocimiento" TEXT;
ALTER TABLE "inspeccion_detalle" ADD COLUMN "comentario_observacion" TEXT;
ALTER TABLE "inspeccion_detalle" ADD COLUMN "comentario_oportunidad_mejora" TEXT;

-- ── hallazgo: nueva clasificación (reporte de hallazgos pedido por el cliente) ──────────────
-- NO_CONFORMIDAD = hallazgo real de incumplimiento (automático o manual, como hasta ahora,
-- con severidad). RECONOCIMIENTO/OBSERVACION/OPORTUNIDAD_MEJORA = generados desde los 3
-- comentarios de la pregunta, informativos, sin severidad y sin plan de cumplimiento.
ALTER TABLE "hallazgo" ADD COLUMN "categoria" VARCHAR(20) NOT NULL DEFAULT 'NO_CONFORMIDAD';
ALTER TABLE "hallazgo" ALTER COLUMN "severidad" DROP NOT NULL;

CREATE INDEX "hallazgo_inspeccion_id_categoria_idx" ON "hallazgo"("inspeccion_id", "categoria");
