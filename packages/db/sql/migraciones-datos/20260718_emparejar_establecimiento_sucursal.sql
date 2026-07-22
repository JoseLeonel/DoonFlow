-- Empareja Inspeccion.establecimiento (texto libre, @deprecated) con Sucursal.nombre
-- de la misma empresa por coincidencia exacta case-insensitive. Deja sucursal_id = NULL
-- en las filas que no logran emparejar (quedan para revisión manual).
-- Ver memoria/cambios_db/registro.md para el resultado de la corrida.

UPDATE "inspeccion" i
SET "sucursal_id" = s.id
FROM "sucursal" s
WHERE i."sucursal_id" IS NULL
  AND i."empresa_id" = s."empresa_id"
  AND lower(trim(i."establecimiento")) = lower(trim(s."nombre"));
