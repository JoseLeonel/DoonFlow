-- sp_accion_correctiva_escalar — 006-vigencia-notificaciones-portal (HU-7)
--
-- Recorre accion_correctiva "vencida" y fecha_limite hace más de 7 días, que no tengan ya una
-- notificacion tipo ACCION_ESCALADA (se escala una sola vez por acción, nunca se repite en
-- corridas futuras del job). "Vencida" se determina igual que
-- domain/accion-correctiva.entity.ts::calcularEstadoEfectivo(): estado persistido no terminal
-- (ni CUMPLIDO ni NO_CUMPLIDO) y fecha_limite pasada — el valor literal 'VENCIDO' NUNCA se
-- persiste en la columna `estado` (se calcula solo en lectura), así que filtrar por
-- `estado = 'VENCIDO'` no encontraría ninguna fila jamás.
-- Resuelve destinatario vía
-- accion_correctiva → hallazgo → inspeccion → sucursal → cliente → usuario (administrador_cliente
-- de ese cliente); si no hay ninguno asignado, cae al rol `administrador` de la empresa (no existe
-- un rol "administrador_general" en este proyecto — ver lección documentada en 011).
--
-- Retorna: cantidad de notificaciones ACCION_ESCALADA insertadas.

CREATE OR REPLACE FUNCTION sp_accion_correctiva_escalar()
RETURNS INTEGER AS $$
DECLARE
  v_insertadas INTEGER := 0;
  v_fila RECORD;
  v_destinatario_id TEXT;
BEGIN
  FOR v_fila IN
    SELECT ac.id, ac.descripcion, ac.fecha_limite, h.inspeccion_id, s.cliente_id, i.empresa_id
    FROM accion_correctiva ac
    JOIN hallazgo h ON h.id = ac.hallazgo_id
    JOIN inspeccion i ON i.id = h.inspeccion_id
    JOIN sucursal s ON s.id = i.sucursal_id
    WHERE ac.estado NOT IN ('CUMPLIDO', 'NO_CUMPLIDO')
      AND ac.fecha_limite < now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM notificacion
        WHERE referencia_tipo = 'accion_correctiva' AND referencia_id = ac.id AND tipo = 'ACCION_ESCALADA'
      )
  LOOP
    SELECT u.id INTO v_destinatario_id
    FROM usuario u
    WHERE u.empresa_id = v_fila.empresa_id AND u.activo = true AND u.cliente_id = v_fila.cliente_id
      AND u.rol_id IN (SELECT id FROM rol WHERE nombre = 'administrador_cliente')
    ORDER BY u.creado_en ASC
    LIMIT 1;

    IF v_destinatario_id IS NULL THEN
      SELECT u.id INTO v_destinatario_id
      FROM usuario u
      WHERE u.empresa_id = v_fila.empresa_id AND u.activo = true
        AND u.rol_id IN (SELECT id FROM rol WHERE nombre = 'administrador')
      ORDER BY u.creado_en ASC
      LIMIT 1;
    END IF;

    IF v_destinatario_id IS NOT NULL THEN
      INSERT INTO notificacion (id, usuario_id, tipo, referencia_tipo, referencia_id, mensaje, empresa_id)
      VALUES (
        gen_random_uuid()::text, v_destinatario_id, 'ACCION_ESCALADA', 'accion_correctiva', v_fila.id,
        'La acción "' || v_fila.descripcion || '" sigue vencida sin actualizarse y fue escalada.',
        v_fila.empresa_id
      );
      v_insertadas := v_insertadas + 1;
    END IF;
  END LOOP;

  RETURN v_insertadas;
END;
$$ LANGUAGE plpgsql;
