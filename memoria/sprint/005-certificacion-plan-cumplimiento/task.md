# Tareas — 005-certificacion-plan-cumplimiento (✅ IMPLEMENTADO 2026-07-21)

> Numeración `T-650` a `T-669` — se renumeró desde el rango original `T-200`–`T-239` porque ese rango ahora pertenece a [[015-wizard-certificacion]] (la parte del wizard que se separó de este sprint).
> Ver `impl.md`/`checklist.md` para el detalle real de implementación y las desviaciones respecto a este listado (generación del código de verificación en TS en vez de en el SP, pdfkit en vez de Puppeteer, `GET .../pdf` retorna `{ url }` en vez de stream binario).

---

## Agente: `agente-basededatos`

- [ ] **T-650** Crear migración `add_firma_certificacion`: `ALTER TABLE inspeccion` agrega `firmado_por_id UUID FK usuario(id) NULLABLE`, `firmado_en TIMESTAMPTZ NULLABLE`, `codigo_verificacion VARCHAR(20) NULLABLE UNIQUE`, `pdf_url TEXT NULLABLE`, `fecha_vencimiento DATE NULLABLE`, `resultado_final VARCHAR(30) NULLABLE`.
- [ ] **T-651** Ampliar `packages/db/prisma/schema.prisma`: agregar los campos de T-650 y la relación `firmadoPor` a `model Inspeccion` (ya ampliado por 015 con `sucursalId`/`periodoEtiqueta`).
- [ ] **T-652** Crear el stored procedure `packages/db/sql/procedimientos/sp_inspeccion_firmar.sql`: recalcula puntaje/clasificación desde `inspeccion_detalle` (reutilizando la misma lógica que `calcularResumen()` de 015, en SQL), genera `codigo_verificacion` único (reintenta ante colisión), calcula `fecha_vencimiento`, fija `resultado_final = 'APROBADA'` de forma provisional, y en una sola transacción actualiza `estado = 'FIRMADA'`. Documentar en comentario SQL que 013 reemplaza esta función para agregar el bloqueo por hallazgo crítico y el cálculo real de `resultado_final`.
- [ ] **T-653** Registrar el cambio en `memoria/cambios_db/registro.md`.

---

## Agente: `agente-backend`

- [ ] **T-654** Ampliar `domain/certificacion.entity.ts` (archivo creado por 015): agregar `puedeFirmarse(certificacion): boolean`, `generarCodigoVerificacion(): string`, `calcularFechaVencimiento(firmadoEn, meses): Date`.
- [ ] **T-655** Ampliar `domain/certificacion.repository.port.ts` (de 015): agregar `firmar` (delega en el SP) y `obtenerPorCodigoVerificacion`.
- [ ] **T-656** Ampliar `domain/inspeccion.errors.ts` (de 015): agregar `CodigoVerificacionEnColisionError`.
- [ ] **T-657** Ampliar `application/certificacion.schema.ts` (de 015): agregar `firmarCertificacionSchema`.
- [ ] **T-658** Crear caso de uso `application/casos-uso/firmar-certificacion.usecase.ts`: invoca `certificacionRepo.firmar()`, traduce excepciones, dispara la generación del PDF (T-660) tras la firma exitosa.
- [ ] **T-659** Ampliar `infrastructure/certificacion.prisma-repository.ts` (de 015): implementar `firmar()` vía `$queryRaw`/`$executeRaw` contra el SP.
- [ ] **T-660** Crear `infrastructure/pdf-certificacion.adapter.ts`: genera el PDF (Puppeteer, ver `impl.md`) y lo sube a Supabase Storage; retorna la URL.
- [ ] **T-661** Ampliar `infrastructure/certificacion.controller.ts` (de 015): agregar handlers de firmar y descargar PDF.
- [ ] **T-662** Ampliar `infrastructure/inspeccion.router.ts` (de 015): agregar `POST .../firmar` y `GET .../pdf`.
- [ ] **T-663** Crear Route Handlers proxy Next.js `firmar/route.ts` y `pdf/route.ts` dentro del árbol de proxy ya existente de 015.

---

## Agente: `agente-frontend`

- [ ] **T-664** Ampliar `packages/shared/src/types/certificacion.ts` (de 015): agregar `firmadoPorId`, `firmadoEn`, `codigoVerificacion`, `pdfUrl`, `fechaVencimiento`, `resultadoFinal` al tipo `Certificacion`.
- [ ] **T-665** Ampliar `_hooks/usar-revision-certificacion.ts` (de 015): reemplazar `guardarYFinalizar()` por una acción `firmar()` que llame al nuevo endpoint, exponga `codigoVerificacion`/`pdfUrl`, y derive `puedeFirmar` (`estado === "EN_PROGRESO"`, ampliado en 013 con el bloqueo por hallazgo crítico).
- [ ] **T-666** Ampliar `certificaciones/[id]/revision/page.tsx` (de 015): agregar el botón "Firmar y certificar", vista post-firma con código de verificación y enlace de descarga del PDF.

---

## Agente: `agente-qa`

- [ ] **T-667** `certificacion.entity.test.ts` (ampliar el de 015): agregar casos de `puedeFirmarse`, `generarCodigoVerificacion`, `calcularFechaVencimiento`.
- [ ] **T-668** `firmar-certificacion.usecase.test.ts`: `firmar()` exitoso retorna `codigoVerificacion`/`pdfUrl`/`resultadoFinal`; `firmar()` sobre certificación ya `FIRMADA` → error.
- [ ] **T-669** Test de integración: flujo completo iniciar (015) → responder por secciones (015) → firmar (este sprint) → `GET` retorna `estado: "FIRMADA"` con `codigoVerificacion`/`pdfUrl` no nulos.

---

## Dependencias entre tareas

```
T-650 → T-651 → T-652 → T-653
T-654 → T-655 → T-657 → T-658
T-656 → T-658
T-652 → T-658, T-659
T-659 → T-661 → T-662 → T-663
T-660 → T-661
T-664 → T-665 → T-666
T-654 → T-667
T-658 → T-668
T-662 → T-669
```
