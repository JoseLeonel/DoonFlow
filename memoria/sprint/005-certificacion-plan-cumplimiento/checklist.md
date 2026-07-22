# Checklist de aceptación — 005-certificacion-plan-cumplimiento

> Retomado e implementado el 2026-07-21. Ver `impl.md` para las desviaciones respecto al diseño original.

---

## Base de datos

- [x] La migración `add_firma_certificacion` aplica sin errores.
- [x] `inspeccion` tiene `firmado_por_id`, `firmado_en`, `codigo_verificacion` (único), `pdf_url`, `fecha_vencimiento`, `resultado_final`.
- [x] `sp_inspeccion_firmar` actualiza `estado`, `puntajeObtenido`, `clasificacion`, `codigoVerificacion` y `fechaVencimiento` en una sola transacción, fijando `resultadoFinal = 'APROBADA'`.
- [x] El comentario SQL al inicio de `sp_inspeccion_firmar.sql` documenta que 013 reemplaza esta función.

---

## API

- [x] `POST /inspeccion/certificaciones/:id/firmar` cambia `estado = FIRMADA`, `resultadoFinal = APROBADA`, genera `codigoVerificacion` único y `pdfUrl`, registra `firmadoPorId`/`firmadoEn`. Verificado con curl (directo y a través del proxy Next.js con sesión real).
- [x] `POST .../firmar` sobre una certificación ya `FIRMADA` retorna 409 (`certificacion_no_editable`). Verificado con curl.
- [x] `GET /inspeccion/certificaciones/:id/pdf` retorna `{ url }` (mismo patrón que `GET /reportes/:id/descargar` de 008, no streaming binario por el proxy genérico). Verificado con curl (200 con la URL del PDF real, magic bytes `%PDF` confirmados).

---

## Frontend — Paso final ampliado (`/certificaciones/[id]/revision`, de 015)

- [x] El botón "Firmar y certificar" **convive** con "Guardar y finalizar" (decisión tomada en el momento, ver `impl.md`) y está habilitado mientras `estado === "EN_PROGRESO"` y no haya pendientes de sincronización (012).
- [x] Al firmar exitosamente, muestra el código de verificación, la fecha de vigencia y un enlace de descarga del PDF.
- [x] Muestra mensaje de error si el backend rechaza la firma.

---

## Reglas de negocio verificadas

- [x] `codigoVerificacion` es único en todo el sistema, no solo por empresa (índice único en `inspeccion.codigo_verificacion`; verificado firmando 3 certificaciones distintas, cada una con código propio).
- [x] Una certificación `FIRMADA` bloquea la edición de respuestas a nivel de API, no solo de UI (verificado con curl: `PATCH .../respuestas` sobre una certificación firmada → 409).

---

## Definición de "done"

1. Todos los ítems de este checklist marcados ✅.
2. HU-2 se ejecuta de punta a punta sobre una certificación ya completada por el wizard de 015: revisar el resumen y firmar, obteniendo código de verificación y PDF descargable. Verificado con curl sobre 3 certificaciones demo reales.
3. Documentado explícitamente que `resultadoFinal` solo calcula el valor real cuando 013 también está implementado.
