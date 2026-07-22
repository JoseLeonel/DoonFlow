-- sp_retencion_purgar_datos — 010-seguridad-privacidad-continuidad
--
-- Recorre `politica_retencion` de una empresa y aplica ANONIMIZAR/ELIMINAR sobre los datos
-- operativos cuya antigüedad supera `meses_retencion`. Nunca escribe en `registro_auditoria`
-- (la capa de infraestructura, job-purgar-retencion.job.ts, genera esas filas a partir del
-- resultado de este SP) y nunca toca `registro_auditoria` como dato a purgar.
--
-- Guardarraíl de seguridad: para DATO_PERSONAL_CONTACTO, tanto ANONIMIZAR como ELIMINAR
-- anonimizan (nunca borran la fila de cliente/sucursal) — un DELETE en cascada arrastraría
-- sucursales/usuarios/certificaciones asociadas, demasiado destructivo para un job automático.
-- Documentado como desviación respecto al spec en impl.md del sprint.
--
-- PDF_CERTIFICACION queda sin efecto: la columna `pdf_url` no existe todavía en `inspeccion`
-- porque 005-certificacion-plan-cumplimiento (firma/PDF) está pausado.

CREATE OR REPLACE FUNCTION sp_retencion_purgar_datos(p_empresa_id TEXT)
RETURNS TABLE(tabla TEXT, id TEXT, accion_aplicada TEXT) AS $$
DECLARE
  v_pol RECORD;
  v_row RECORD;
BEGIN
  -- ── EVIDENCIA ──────────────────────────────────────────────────────────
  SELECT * INTO v_pol FROM politica_retencion
    WHERE empresa_id = p_empresa_id AND tipo_dato = 'EVIDENCIA';

  IF FOUND THEN
    IF v_pol.accion_al_vencer = 'ELIMINAR' THEN
      FOR v_row IN
        SELECT ie.id
        FROM inspeccion_evidencia ie
        JOIN inspeccion i ON i.id = ie.inspeccion_id
        WHERE i.empresa_id = p_empresa_id
          AND ie.creado_en < now() - (v_pol.meses_retencion || ' months')::interval
      LOOP
        DELETE FROM inspeccion_evidencia WHERE id = v_row.id;
        tabla := 'inspeccion_evidencia'; id := v_row.id; accion_aplicada := 'ELIMINADO';
        RETURN NEXT;
      END LOOP;
    ELSE
      FOR v_row IN
        SELECT ie.id
        FROM inspeccion_evidencia ie
        JOIN inspeccion i ON i.id = ie.inspeccion_id
        WHERE i.empresa_id = p_empresa_id
          AND ie.creado_en < now() - (v_pol.meses_retencion || ' months')::interval
          AND ie.url <> 'ANONIMIZADO'
      LOOP
        UPDATE inspeccion_evidencia SET url = 'ANONIMIZADO', nombre = 'ANONIMIZADO' WHERE id = v_row.id;
        tabla := 'inspeccion_evidencia'; id := v_row.id; accion_aplicada := 'ANONIMIZADO';
        RETURN NEXT;
      END LOOP;
    END IF;
  END IF;

  -- ── DATO_PERSONAL_CONTACTO (cliente + sucursal, solo inactivos) ─────────
  SELECT * INTO v_pol FROM politica_retencion
    WHERE empresa_id = p_empresa_id AND tipo_dato = 'DATO_PERSONAL_CONTACTO';

  IF FOUND THEN
    FOR v_row IN
      SELECT c.id
      FROM cliente c
      WHERE c.empresa_id = p_empresa_id
        AND c.activo = false
        AND c.actualizado_en < now() - (v_pol.meses_retencion || ' months')::interval
        AND c.correo1 <> 'anonimizado@doonflow.demo'
    LOOP
      UPDATE cliente SET
        nombre_responsable = 'ANONIMIZADO',
        correo1 = 'anonimizado@doonflow.demo',
        correo2 = NULL, correo3 = NULL, movil = NULL, direccion = NULL,
        identificacion_empresa = NULL
      WHERE id = v_row.id;
      tabla := 'cliente'; id := v_row.id; accion_aplicada := 'ANONIMIZADO';
      RETURN NEXT;
    END LOOP;

    FOR v_row IN
      SELECT s.id
      FROM sucursal s
      WHERE s.empresa_id = p_empresa_id
        AND s.activo = false
        AND s.actualizado_en < now() - (v_pol.meses_retencion || ' months')::interval
        AND (s.correo IS NOT NULL OR s.movil IS NOT NULL OR s.direccion IS NOT NULL)
    LOOP
      UPDATE sucursal SET correo = NULL, movil = NULL, direccion = NULL WHERE id = v_row.id;
      tabla := 'sucursal'; id := v_row.id; accion_aplicada := 'ANONIMIZADO';
      RETURN NEXT;
    END LOOP;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql;
