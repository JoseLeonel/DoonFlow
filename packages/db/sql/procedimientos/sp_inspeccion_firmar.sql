-- sp_inspeccion_firmar — 005-certificacion-plan-cumplimiento (retomado 2026-07-21),
-- reemplazado por 013-hallazgos-plan-cumplimiento (2026-07-22)
--
-- Firma/certifica una Inspeccion: bloquea la fila, valida que no haya hallazgos CRITICA sin
-- resolver, recalcula puntaje/porcentaje/clasificación desde inspeccion_detalle (misma lógica
-- que calcularResumen() de 015-wizard-certificacion, en SQL para que sea atómico con el cambio
-- de estado), calcula fecha_vencimiento, calcula resultado_final según la severidad de los
-- hallazgos (regla 1 de 013) y persiste todo junto con el código de verificación en una sola
-- transacción.
--
-- El código de verificación se genera en la capa de aplicación (TS), no aquí — este SP solo
-- lo valida y persiste; si colisiona con uno existente (UNIQUE), Postgres levanta
-- unique_violation (23505) y el caso de uso reintenta con un código nuevo (deviación
-- documentada respecto a impl.md original de 005).
--
-- resultado_final: sin hallazgos → APROBADA; con hallazgos MAYOR/MENOR únicamente →
-- APROBADA_CON_OBSERVACIONES; con al menos un hallazgo CRITICA sin ninguna acción_correctiva
-- CUMPLIDO → se rechaza la firma con RAISE EXCEPTION 'hallazgo_critico_pendiente' (no se llega
-- a fijar resultado_final, la transacción se revierte por completo).
--
-- Parámetros: p_inspeccion_id (certificación a firmar), p_usuario_id (quién firma),
-- p_codigo_verificacion (candidato ya generado en TS), p_meses_vigencia (vigencia del
-- certificado, default 12).
-- Retorna: la fila completa de "inspeccion" ya actualizada (SETOF inspeccion).

CREATE OR REPLACE FUNCTION sp_inspeccion_firmar(
  p_inspeccion_id TEXT,
  p_usuario_id TEXT,
  p_codigo_verificacion TEXT,
  p_meses_vigencia INT DEFAULT 12
)
RETURNS SETOF inspeccion AS $$
DECLARE
  v_estado TEXT;
  v_plantilla_id TEXT;
  v_puntaje_maximo NUMERIC;
  v_puntaje_obtenido NUMERIC;
  v_porcentaje NUMERIC;
  v_clasificacion TEXT;
  v_hallazgos_criticos_pendientes INT;
  v_hay_hallazgos_mayores_menores INT;
  v_resultado_final TEXT;
BEGIN
  SELECT estado, plantilla_id INTO v_estado, v_plantilla_id
    FROM inspeccion WHERE id = p_inspeccion_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'certificacion_no_encontrada';
  END IF;

  IF v_estado <> 'EN_PROGRESO' THEN
    RAISE EXCEPTION 'certificacion_no_editable';
  END IF;

  SELECT COUNT(*) INTO v_hallazgos_criticos_pendientes
    FROM hallazgo h
    WHERE h.inspeccion_id = p_inspeccion_id
      AND h.severidad = 'CRITICA'
      AND NOT EXISTS (
        SELECT 1 FROM accion_correctiva ac
        WHERE ac.hallazgo_id = h.id AND ac.estado = 'CUMPLIDO'
      );

  IF v_hallazgos_criticos_pendientes > 0 THEN
    RAISE EXCEPTION 'hallazgo_critico_pendiente';
  END IF;

  SELECT COUNT(*) INTO v_hay_hallazgos_mayores_menores
    FROM hallazgo WHERE inspeccion_id = p_inspeccion_id AND severidad IN ('MAYOR', 'MENOR');

  v_resultado_final := CASE WHEN v_hay_hallazgos_mayores_menores > 0
    THEN 'APROBADA_CON_OBSERVACIONES'
    ELSE 'APROBADA' END;

  SELECT puntaje_maximo INTO v_puntaje_maximo FROM inspeccion_plantilla WHERE id = v_plantilla_id;

  SELECT COALESCE(SUM(puntaje_obtenido), 0) INTO v_puntaje_obtenido
    FROM inspeccion_detalle WHERE inspeccion_id = p_inspeccion_id;

  v_porcentaje := CASE WHEN v_puntaje_maximo > 0
    THEN ROUND((v_puntaje_obtenido / v_puntaje_maximo) * 100, 2)
    ELSE 0 END;

  SELECT clasificacion INTO v_clasificacion
    FROM inspeccion_rango_resultado
    WHERE plantilla_id = v_plantilla_id AND v_porcentaje >= desde AND v_porcentaje <= hasta
    ORDER BY orden ASC LIMIT 1;

  UPDATE inspeccion SET
    estado = 'FIRMADA',
    firmado_por_id = p_usuario_id,
    firmado_en = now(),
    codigo_verificacion = p_codigo_verificacion,
    fecha_vencimiento = (now() + (p_meses_vigencia || ' months')::interval)::date,
    resultado_final = v_resultado_final,
    puntaje_obtenido = v_puntaje_obtenido,
    puntaje_maximo = v_puntaje_maximo,
    porcentaje_cumplimiento = v_porcentaje,
    clasificacion = v_clasificacion
  WHERE id = p_inspeccion_id;

  RETURN QUERY SELECT * FROM inspeccion WHERE id = p_inspeccion_id;
END;
$$ LANGUAGE plpgsql;
