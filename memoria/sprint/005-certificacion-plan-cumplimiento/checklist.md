# Checklist de aceptación — 005-certificacion-plan-cumplimiento (⏸️ PAUSADO)

> No implementar sin decisión explícita del usuario. Referencia para cuando se retome.

---

## Base de datos

- [ ] La migración `add_firma_certificacion` aplica sin errores.
- [ ] `inspeccion` tiene `firmado_por_id`, `firmado_en`, `codigo_verificacion` (único), `pdf_url`, `fecha_vencimiento`, `resultado_final`.
- [ ] `sp_inspeccion_firmar` actualiza `estado`, `puntajeObtenido`, `clasificacion`, `codigoVerificacion` y `fechaVencimiento` en una sola transacción, fijando `resultadoFinal = 'APROBADA'`.
- [ ] El comentario SQL al inicio de `sp_inspeccion_firmar.sql` documenta que 013 reemplaza esta función.

---

## API

- [ ] `POST /inspeccion/certificaciones/:id/firmar` cambia `estado = FIRMADA`, `resultadoFinal = APROBADA`, genera `codigoVerificacion` único y `pdfUrl`, registra `firmadoPorId`/`firmadoEn`.
- [ ] `POST .../firmar` sobre una certificación ya `FIRMADA` retorna 409.
- [ ] `GET /inspeccion/certificaciones/:id/pdf` descarga o redirige al PDF generado.

---

## Frontend — Paso final ampliado (`/certificaciones/[id]/revision`, de 015)

- [ ] El botón "Firmar y certificar" reemplaza a "Guardar y finalizar" (o convive con él, a decidir en el momento) y está habilitado mientras `estado === "EN_PROGRESO"` (en este sprint sin bloqueo por hallazgo; ver 013).
- [ ] Al firmar exitosamente, muestra el código de verificación y un enlace de descarga del PDF.
- [ ] Muestra mensaje de error si el backend rechaza la firma.

---

## Reglas de negocio verificadas

- [ ] `codigoVerificacion` es único en todo el sistema, no solo por empresa.
- [ ] Una certificación `FIRMADA` bloquea la edición de respuestas a nivel de API, no solo de UI.

---

## Definición de "done" (si se retoma)

1. Todos los ítems de este checklist marcados ✅.
2. HU-2 se ejecuta de punta a punta sobre una certificación ya completada por el wizard de 015: revisar el resumen y firmar, obteniendo código de verificación y PDF descargable.
3. Documentado explícitamente que `resultadoFinal` solo calcula el valor real cuando 013 también está implementado.
