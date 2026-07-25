-- sp_notificacion_generar_vencimientos — 006-vigencia-notificaciones-portal
--
-- Recorre accion_correctiva (VENCIDO hoy, o a 30/15/5/0 días de fecha_limite) e inspeccion
-- (FIRMADA, a 30/15/5/0 días de fecha_vencimiento), insertando una fila en "notificacion" por
-- cada destinatario. Idempotente: no duplica si ya existe una fila con el mismo
-- (referencia_tipo, referencia_id, tipo) creada en las últimas 24 horas (usa el índice
-- compuesto de la migración de este sprint).
--
-- Acción correctiva: notifica al responsable (responsable_id). "Vencida" se determina en SQL
-- con la misma regla que domain/accion-correctiva.entity.ts::calcularEstadoEfectivo() (estado
-- persistido no terminal + fecha_limite pasada), porque el estado persistido puede no
-- reflejar "VENCIDO" todavía (se calcula en lectura, no hay job que lo persista).
-- Certificación: notifica al alcance de la sucursal — todo `usuario` con `cliente_id` igual al
-- de la sucursal (administrador_cliente) más los `usuario_sucursal` de esa sucursal específica,
-- más todo `administrador` de la empresa (visibilidad total).
--
-- Retorna: cantidad de filas insertadas (INTEGER).

CREATE OR REPLACE FUNCTION sp_notificacion_generar_vencimientos()
RETURNS INTEGER AS $$
DECLARE
  v_insertadas INTEGER := 0;
  v_filas_insertadas INTEGER;
  v_fila RECORD;
  v_tipo TEXT;
BEGIN
  -- ── Acciones correctivas: por vencer (30/15/5) o vencida (0 y ya vencida) ─────────────
  FOR v_fila IN
    SELECT ac.id, ac.responsable_id, ac.descripcion, ac.fecha_limite,
           (ac.fecha_limite::date - CURRENT_DATE) AS dias_restantes
    FROM accion_correctiva ac
    WHERE ac.estado NOT IN ('CUMPLIDO', 'NO_CUMPLIDO')
      AND (ac.fecha_limite::date - CURRENT_DATE) IN (30, 15, 5, 0)
  LOOP
    v_tipo := CASE WHEN v_fila.dias_restantes <= 0 THEN 'ACCION_VENCIDA' ELSE 'ACCION_POR_VENCER' END;

    IF NOT EXISTS (
      SELECT 1 FROM notificacion
      WHERE referencia_tipo = 'accion_correctiva' AND referencia_id = v_fila.id AND tipo = v_tipo
        AND creado_en > now() - interval '24 hours'
    ) THEN
      INSERT INTO notificacion (id, usuario_id, tipo, referencia_tipo, referencia_id, mensaje, empresa_id)
      SELECT gen_random_uuid()::text, v_fila.responsable_id, v_tipo, 'accion_correctiva', v_fila.id,
             CASE WHEN v_tipo = 'ACCION_VENCIDA'
               THEN 'La acción "' || v_fila.descripcion || '" venció.'
               ELSE 'La acción "' || v_fila.descripcion || '" vence en ' || v_fila.dias_restantes || ' día(s).'
             END,
             u.empresa_id
      FROM usuario u WHERE u.id = v_fila.responsable_id;
      v_insertadas := v_insertadas + 1;
    END IF;
  END LOOP;

  -- ── Certificaciones firmadas: por vencer (30/15/5/0) ──────────────────────────────────
  FOR v_fila IN
    SELECT i.id, i.sucursal_id, i.periodo_etiqueta, i.fecha_vencimiento, i.empresa_id,
           s.nombre AS sucursal_nombre, s.cliente_id,
           (i.fecha_vencimiento - CURRENT_DATE) AS dias_restantes
    FROM inspeccion i
    JOIN sucursal s ON s.id = i.sucursal_id
    WHERE i.estado = 'FIRMADA'
      AND (i.fecha_vencimiento - CURRENT_DATE) IN (30, 15, 5, 0)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM notificacion
      WHERE referencia_tipo = 'inspeccion' AND referencia_id = v_fila.id AND tipo = 'CERTIFICACION_POR_VENCER'
        AND creado_en > now() - interval '24 hours'
    ) THEN
      INSERT INTO notificacion (id, usuario_id, tipo, referencia_tipo, referencia_id, mensaje, empresa_id)
      SELECT gen_random_uuid()::text, u.id, 'CERTIFICACION_POR_VENCER', 'inspeccion', v_fila.id,
             'La certificación de ' || v_fila.sucursal_nombre ||
               CASE WHEN v_fila.periodo_etiqueta IS NOT NULL THEN ' (' || v_fila.periodo_etiqueta || ')' ELSE '' END ||
               ' vence en ' || v_fila.dias_restantes || ' día(s).',
             v_fila.empresa_id
      FROM usuario u
      WHERE u.activo = true AND u.empresa_id = v_fila.empresa_id
        AND (
          u.rol_id IN (SELECT id FROM rol WHERE nombre = 'administrador')
          OR u.cliente_id = v_fila.cliente_id
          OR u.sucursal_id = v_fila.sucursal_id
          OR EXISTS (SELECT 1 FROM usuario_sucursal_acceso usa WHERE usa.usuario_id = u.id AND usa.sucursal_id = v_fila.sucursal_id)
        );
      GET DIAGNOSTICS v_filas_insertadas = ROW_COUNT;
      v_insertadas := v_insertadas + v_filas_insertadas;
    END IF;
  END LOOP;

  RETURN v_insertadas;
END;
$$ LANGUAGE plpgsql;
