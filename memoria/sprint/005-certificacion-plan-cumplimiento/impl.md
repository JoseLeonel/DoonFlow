# Guía de implementación — 005-certificacion-plan-cumplimiento

> Retomado e implementado el 2026-07-21 (el usuario eligió retomarlo en vez de continuar con 014).

---

## Qué se construyó

HU-2 completa: firma/confirmación de una certificación ya completada por el wizard de [[015-wizard-certificacion]], generación de código de verificación único y PDF descargable.

1. **BD**: `inspeccion.firmado_por_id/firmado_en/codigo_verificacion(único)/pdf_url/fecha_vencimiento/resultado_final` (migración `20260721230000_add_firma_certificacion`) + `sp_inspeccion_firmar(p_inspeccion_id, p_usuario_id, p_codigo_verificacion, p_meses_vigencia=12)`: bloquea la fila (`FOR UPDATE`), valida `estado='EN_PROGRESO'`, recalcula puntaje/porcentaje/clasificación desde `inspeccion_detalle` (antes solo se calculaba al vuelo, nunca se persistía) y en una transacción actualiza `estado='FIRMADA'` + campos de firma.
2. **Backend**: `certificacion.entity.ts` ampliado (`EstadoCertificacion`, `puedeFirmarse` ahora también exige `estado==="EN_PROGRESO"` — antes solo miraba pendientes de sync, `generarCodigoVerificacion`, `calcularFechaVencimiento`), `FirmarCertificacionUseCase` nuevo, `certificacion.prisma-repository.ts` ampliado (`firmar()`, `establecerPdfUrl()`), `certificacion.controller.ts`/`inspeccion.router.ts` ampliados (`POST .../firmar`, `GET .../pdf`), wiring en `index.ts`.
3. **PDF**: `pdf-certificacion.adapter.ts` (pdfkit) + `LocalCertificacionPdfAdapter`/`SupabaseCertificacionPdfAdapter` (mismo patrón dual que evidencias, bucket/carpeta propios `certificaciones-pdf`/`certificaciones` para no mezclar con evidencias subidas por el usuario).
4. **Frontend**: tipos compartidos ampliados, `certificacion.servicio.ts` (`firmarCertificacion`, `obtenerPdfCertificacion`), `usar-revision-certificacion.ts` ampliado (`puedeFirmar`, `firmar()`, `errorFirma`), `revision/page.tsx` con vista post-firma (código + vigencia + descarga) y botón "Firmar y certificar" que **convive** con "Guardar y finalizar" (no lo reemplaza).

---

## Desviaciones respecto al diseño original (`spec.md`/`task.md` de 2026-07-16)

1. **PDF con pdfkit, no Puppeteer**: el diseño original elegía Puppeteer (HTML→PDF) para no acoplar el render a una librería de reportes. Pero en el ínterin (2026-07-21, mismo día) el sprint 008-reportes-analytics ya agregó `pdfkit` como dependencia del monorepo para sus propios PDFs. Se reutiliza esa misma librería en vez de sumar Puppeteer/Chromium (dependencia mucho más pesada) para un documento de una sola página. Mismo patrón que `ReportePdfAdapter`.
2. **Generación del código de verificación en TypeScript, no dentro del SP**: el diseño original hacía que `sp_inspeccion_firmar` generara y reintentara el código internamente. Se cambió a que `generarCodigoVerificacion()` (dominio) genere el candidato y `FirmarCertificacionUseCase.firmarConReintento()` reintente (hasta 5 veces) si `sp_inspeccion_firmar` reporta colisión por el índice único — evita duplicar el algoritmo de generación en dos lenguajes y deja el reintento en la capa más fácil de testear (unit test con mocks, ver `firmar-certificacion.usecase.test.ts`). El SP conserva la responsabilidad atómica de bloquear la fila, recalcular puntaje/clasificación y persistir el cambio de estado.
3. **`GET .../pdf` retorna `{ url }`, no un stream binario**: mismo patrón que `GET /reportes/:id/descargar` (008) — el proxy genérico `apps/web/src/app/api/inspeccion/[...path]/route.ts` siempre hace `await apiRes.json()`, así que agregar passthrough binario ahí habría significado tocar una ruta compartida por todos los demás endpoints del módulo (evidencias multipart incluidas). El frontend abre `pdfUrl` directamente (funciona igual con el adaptador local — servido por el `express.static("/archivos")` ya montado — que con Supabase Storage público).
4. **Botón "Firmar y certificar" convive con "Guardar y finalizar"**, no lo reemplaza: se decidió en el momento para no quitarle al usuario la opción de guardar un avance sin firmar todavía (el spec dejaba esto "a decidir en el momento").
5. **Storage de PDF en bucket/carpeta propios** (`certificaciones-pdf` local / `certificaciones` en Supabase), no reutilizando el bucket `evidencias` — separa documentos generados por el sistema de archivos subidos por el usuario, mismo criterio que 008 usó para su propio bucket `reportes`.

---

## Pendiente / fuera de alcance (sin cambios respecto al spec original)

- **Hallazgos, plan de cumplimiento, resultado real por severidad** — [[013-hallazgos-plan-cumplimiento]], sigue bloqueado hasta que se implemente; `resultadoFinal` queda fijo en `APROBADA`.
- **Notificaciones de vencimiento, portal público de verificación** — [[006-vigencia-notificaciones-portal]] (HU-1/HU-3), sigue parcialmente bloqueado; ahora que `codigoVerificacion`/`fechaVencimiento` existen, esas HU podrían retomarse en un sprint futuro.
- **API keys / verificación pública programática** — HU-3 de [[009-integraciones-datos-masivos]], pospuesta; ahora que existen los campos que necesitaba, podría retomarse.
- **Aceptación/apelaciones de certificación** — [[011-aceptacion-apelaciones-certificacion]], sigue bloqueado (depende de hallazgos, no solo de la firma).

---

## Verificación

- 191 tests backend (185→191, +6 en `firmar-certificacion.usecase.test.ts`) + 6 nuevos en `certificacion.entity.test.ts` (generarCodigoVerificacion/calcularFechaVencimiento/puedeFirmarse con FIRMADA) — todos en verde.
- 199 tests frontend (195→199, +4 en `usar-revision-certificacion.test.ts`) — en verde, misma única excepción preexistente de sprint 001 (`strip-resumen-plantilla.test.tsx`, 6 tests, no tocado).
- Verificado end-to-end vía curl, directo contra `apps/api` (puerto 4000) y a través del proxy real de Next.js (puerto 3000) con sesión real: firmar 3 certificaciones demo distintas (códigos de verificación únicos confirmados), PDF real descargado (`%PDF` en los primeros bytes), `GET .../pdf`, doble firma → 409, `pendientesSincronizacion>0` → 409, edición de respuestas sobre certificación ya firmada → 409, y la página `/certificaciones/[id]/revision` cargando sin error de servidor para una certificación firmada.
- **No verificado con clics reales en un navegador** (sin herramienta de automatización de browser en esta sesión, mismo límite que sprints anteriores).
