-- sp_plan_cumplimiento_indicadores — 013-hallazgos-plan-cumplimiento
--
-- Calcula los indicadores agregados de un plan de cumplimiento a partir de sus acciones
-- correctivas, aplicando en la misma lectura el cálculo de "vencido" (fecha_limite ya pasada
-- y estado no terminal) — sin job programado, ver domain/accion-correctiva.entity.ts
-- (calcularEstadoEfectivo, misma regla replicada aquí para que la lectura agregada y la
-- lectura por fila nunca queden inconsistentes entre sí).
--
-- Parámetro: p_plan_id (plan de cumplimiento a resumir).
-- Retorna una única fila con: total, pendientes, en_proceso, en_revision, cumplidas,
-- no_cumplidas, vencidas, porcentaje_cumplimiento (cumplidas/total*100), proximas_a_vencer
-- (fecha_limite entre ahora y +7 días, estado no terminal).

CREATE OR REPLACE FUNCTION sp_plan_cumplimiento_indicadores(p_plan_id TEXT)
RETURNS TABLE (
  total                    INT,
  pendientes               INT,
  en_proceso               INT,
  en_revision              INT,
  cumplidas                INT,
  no_cumplidas             INT,
  vencidas                 INT,
  porcentaje_cumplimiento  NUMERIC,
  proximas_a_vencer        INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT AS total,
    COUNT(*) FILTER (WHERE ac.estado = 'PENDIENTE')::INT AS pendientes,
    COUNT(*) FILTER (WHERE ac.estado = 'EN_PROCESO')::INT AS en_proceso,
    COUNT(*) FILTER (WHERE ac.estado = 'EN_REVISION')::INT AS en_revision,
    COUNT(*) FILTER (WHERE ac.estado = 'CUMPLIDO')::INT AS cumplidas,
    COUNT(*) FILTER (WHERE ac.estado = 'NO_CUMPLIDO')::INT AS no_cumplidas,
    COUNT(*) FILTER (
      WHERE ac.fecha_limite < now() AND ac.estado NOT IN ('CUMPLIDO', 'NO_CUMPLIDO')
    )::INT AS vencidas,
    CASE WHEN COUNT(*) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE ac.estado = 'CUMPLIDO')::NUMERIC / COUNT(*)) * 100, 2)
      ELSE 0 END AS porcentaje_cumplimiento,
    COUNT(*) FILTER (
      WHERE ac.fecha_limite BETWEEN now() AND now() + interval '7 days'
        AND ac.estado NOT IN ('CUMPLIDO', 'NO_CUMPLIDO')
    )::INT AS proximas_a_vencer
  FROM accion_correctiva ac
  WHERE ac.plan_cumplimiento_id = p_plan_id;
END;
$$ LANGUAGE plpgsql;
