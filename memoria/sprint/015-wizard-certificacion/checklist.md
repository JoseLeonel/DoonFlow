# Checklist de aceptación — 015-wizard-certificacion

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador o en un test. "Está escrito" no es suficiente.
> ⭐ HU principal de todo el desarrollo — cubre únicamente HU-1 (wizard de formulario). **Sin firma digital, PDF ni código de verificación** — eso queda pausado en [[005-certificacion-plan-cumplimiento]]. Ver [[013-hallazgos-plan-cumplimiento]] para el checklist de hallazgos/plan de cumplimiento (que depende de que la firma se retome).
> **Verificado 2026-07-20** vía curl contra la API real + proxy Next.js (con cookie de sesión real) y suites de test (93 backend / 116 frontend, ver detalle abajo). **No verificado con clics reales en un navegador** — sin herramienta de automatización de browser disponible en esta sesión (mismo límite que 003/004, ver `estado.md`); las páginas se confirmaron con carga/compilación sin error (HTTP 200, sin errores en el log del servidor de desarrollo).

---

## Base de datos

- [x] La migración `add_certificacion` aplica sin errores (`pnpm --filter db migrate:dev`).
- [x] `inspeccion` tiene las columnas nuevas: `sucursal_id`, `periodo_etiqueta`. La columna `establecimiento` sigue existiendo (no se eliminó). **No** existen columnas de firma (`firmado_por_id`, `codigo_verificacion`, `pdf_url`, etc.) en este sprint. Verificado con `\d inspeccion` en psql.
- [x] El índice de rendimiento `inspeccion(sucursal_id)` existe (`\d inspeccion` en psql) — `inspeccion_sucursal_id_idx`.
- [x] El script de emparejamiento `establecimiento` → `sucursal` corrió sobre datos de prueba (0 filas, sin inspecciones reales en ese momento) y quedó documentado en `memoria/cambios_db/registro.md`.

---

## API — Certificaciones (formulario)

- [x] `POST /inspeccion/certificaciones` con plantilla activa y sucursal válida crea la `Inspeccion` en `EN_PROGRESO` y retorna `{ data: Certificacion }`. Verificado con curl.
- [x] `POST /inspeccion/certificaciones` con plantilla inactiva retorna error (`PlantillaInactivaError` → 422). Verificado con test unitario del caso de uso.
- [x] `POST /inspeccion/certificaciones` con sucursal fuera del alcance del usuario autenticado retorna 403 (`SucursalFueraDeAlcanceError`). Verificado con test unitario del caso de uso.
- [x] `POST /inspeccion/certificaciones` sin `sucursalId` retorna 400 (`SucursalRequeridaError` / validación Zod). Verificado con curl (`{"error":{"codigo":"validacion_fallida",...}}`, HTTP 400).
- [x] `GET /inspeccion/certificaciones` retorna solo las certificaciones dentro del alcance del usuario (filtro por `alcance` en `certificacion.prisma-repository.ts`, mismo patrón de `clientes`/`sucursales` ya verificado en 003/004).
- [x] `GET /inspeccion/certificaciones/:id` retorna la certificación completa con detalles y evidencias. Verificado con curl (incluye `plantilla.nodos`, `detalles`, `evidencias`).
- [x] `PATCH /inspeccion/certificaciones/:id/respuestas` guarda el batch de respuestas y retorna los detalles actualizados — **sin `seccionId` en la ruta** (decisión de implementación: el backend upsertea los `nodoId` recibidos; el frontend es quien acota el batch a la sección actual). Verificado con curl y test de integración manual.
- [x] `POST /inspeccion/certificaciones/:id/evidencias` sube un archivo válido (jpg/png/heic/pdf/doc/docx, ≤10MB) y lo asocia al `detalleId`. Verificado con curl (directo a la API y a través del proxy Next.js con multipart real).
- [x] `POST .../evidencias` con archivo tipo no permitido retorna 422 (`ArchivoNoPermitidoError`), validado en backend. Verificado con curl (`.exe` rechazado).
- [x] `GET /inspeccion/certificaciones/:id/resumen` retorna puntaje/porcentaje/clasificación calculados en el momento (no requiere firma previa). Verificado con curl y test unitario.
- [x] Todas las rutas de certificaciones retornan 401 sin token. Verificado con curl.
- [x] Acceder a una certificación de otra empresa retorna 404 (aislamiento multiempresa) — garantizado por construcción: el `where` del repositorio siempre incluye `empresaId` del JWT sin colisión de claves (no reproduce el bug de spread encontrado en sprint 004). No se probó con una segunda empresa real en esta sesión.
- [x] **No existe** ningún endpoint `/firmar` ni `/pdf` en este sprint.

---

## Frontend — Wizard de certificación (⭐ flujo principal)

### Paso 0: Indicar el período (`/certificaciones/nueva`)

- [x] El selector Cliente → Sucursal → Período respeta el alcance del usuario (`listarClientes`/`listarSucursales` ya filtran por alcance en el backend, reutilizados de 003/004).
- [x] Solo se listan sucursales activas (`usar-iniciar-certificacion.ts` filtra `s.activo`).
- [x] El botón "Iniciar formulario" está deshabilitado hasta completar los 3 campos (`puedeIniciar`).
- [x] Al iniciar, redirige a `/certificaciones/[id]/responder` (arranca en el paso 1) — el período queda fijo desde este punto (no hay forma de editarlo dentro del wizard).

### Pasos 1..N: una sección por paso (`/certificaciones/[id]/responder`)

- [x] Cada paso muestra **una sola sección de nivel 0** (con su título como cabecera) — nunca el árbol completo de la plantilla a la vez (`SeccionWizard` recibe solo `seccionActual`).
- [x] La barra de progreso superior muestra "Paso X de N · [título de la sección]" y usa `sticky top-0` para permanecer fija al hacer scroll.
- [x] Cada pregunta del paso muestra el widget de respuesta correcto según `tipoRespuesta` (SI_NO, selección única/múltiple, texto libre, numérico, puntaje manual) — `respuesta-widget.tsx`.
- [x] El botón "Siguiente" guarda las respuestas del paso actual (`avanzar()` llama `guardarSeccion`) y avanza al paso N+1.
- [x] El botón "Anterior" navega al paso previo sin perder lo ya respondido (el estado de respuestas vive en un único mapa por `nodoId` en `usar-responder-certificacion`, no se limpia al cambiar de paso).
- [x] El botón "Anterior" está deshabilitado en el paso 1.
- [x] En el último paso (N), el botón dice "Continuar a revisión" y `avanzar()` navega a `/certificaciones/[id]/revision` en vez de incrementar `pasoActual`. Verificado con test (`usar-wizard-certificacion.test.ts`, `wizard-certificacion.test.tsx`).
- [x] Clic en un paso **ya visitado** de la barra de progreso navega directo a ese paso (`irAPaso`). Verificado con test.
- [x] Clic en un paso **no visitado** (más allá del siguiente inmediato) no hace nada (botón deshabilitado). Verificado con test.
- [x] Se puede adjuntar evidencia a una pregunta una vez que la sección se guardó al menos una vez (existe `detalleId`) — verificado con curl (subida real vía proxy multipart).
- [x] Si se recarga a mitad del wizard, `usar-wizard-certificacion` recalcula `pasoActual` a partir de qué secciones ya tienen alguna respuesta guardada (no vuelve forzosamente al paso 1). Verificado con test.
- [x] El placeholder obsoleto `inspecciones/[id]/ejecutar/page.tsx` ya no existe en el árbol de archivos (eliminado).

### Paso final: Revisión (sin firma) (`/certificaciones/[id]/revision`)

- [x] Muestra puntaje obtenido / máximo, porcentaje y clasificación, desglosado por sección. Verificado con curl (`GET .../resumen`) y visualmente en el HTML renderizado.
- [x] Indica si alguna sección quedó sin responder (banner condicionado a `haySeccionesIncompletas`).
- [x] El botón "Volver a esta sección" regresa al wizard (`/certificaciones/[id]/responder?seccionId=...`) en el paso correspondiente.
- [x] El botón "Guardar y finalizar" está siempre habilitado y navega a `/certificaciones` al presionarlo. Verificado con test (`usar-revision-certificacion.test.ts`).
- [x] **No existe** botón de "Firmar", código de verificación, ni enlace de PDF en esta pantalla.

---

## Reglas de negocio verificadas

- [x] Una sucursal puede tener N certificaciones a lo largo del tiempo, cada una independiente (sin unicidad en el schema).
- [x] Un formulario permite editar respuestas libremente en cualquier momento (`puedeEditarRespuestas` siempre `true` en este sprint).
- [x] `empresaId` viene siempre del JWT (`req.usuario!.empresaId`); el alcance adicional sigue las reglas de 004 en todos los endpoints de este sprint.
- [x] No se elimina físicamente ninguna certificación ni evidencia (no existen endpoints `DELETE` para estos recursos).

---

## Tests de unidad — Backend (`agente-qa`)

**`certificacion.entity.test.ts` (8 tests, ✅ en verde):**
- [x] `puedeEditarRespuestas` retorna `true` (único estado posible en este sprint)
- [x] `calcularResumen([], ...)` → `puntajeObtenido: 0`
- [x] `calcularResumen(detalles, ...)` con datos de varias secciones → suma, porcentaje y clasificación correctas
- [x] (extra) `calcularResumenPorSeccion` y `calcularPuntajeRespuesta` (SI_NO/POR_OPCIONES/MANUAL)

**Casos de uso (mock del repositorio) — `iniciar-certificacion.usecase.test.ts` (4 tests) y `responder-certificacion.usecase.test.ts` (4 tests), ✅ en verde:**
- [x] `iniciar()` con plantilla inactiva → error
- [x] `iniciar()` con sucursal fuera de alcance → `SucursalFueraDeAlcanceError`
- [x] `iniciar()` exitoso llama `repo.iniciar()` con `plantillaVersion` congelada
- [x] `guardarRespuestasSeccion()` calcula el snapshot (ruta/título/puntaje) y lo pasa al repositorio
- [x] `obtenerResumen()` usa `calcularResumen()` sobre los detalles y la plantilla cargados

**Test de integración (BD real local):**
- [x] Verificado **manualmente vía curl** (no como archivo de test automatizado permanente): `POST /inspeccion/certificaciones` → `PATCH .../respuestas` → `POST .../evidencias` (multipart, vía proxy) → `GET .../resumen` retorna puntaje/porcentaje/clasificación correctos, con `estado` todavía `EN_PROGRESO`. Ver nota en `task.md` T-238 — queda pendiente si se quiere un test de integración automatizado permanente.

---

## Tests de unidad — Frontend (`agente-qa`)

**Hooks — 5 archivos de test, 21 tests, ✅ en verde:**
- [x] `usar-responder-certificacion.test.ts`: `progresoGlobal` se recalcula al actualizar/guardar respuestas de una sección
- [x] `usar-revision-certificacion.test.ts`: `haySeccionesIncompletas` refleja correctamente secciones sin completar; `guardarYFinalizar()` navega a `/certificaciones` sin llamar ningún endpoint de firma
- [x] `usar-wizard-certificacion.test.ts` (7 tests): `pasoActual` inicial, recalculo al recargar, `avanzar()`/`retroceder()`/`irAPaso()` según lo descrito en `task.md` (T-243)
- [x] `wizard-certificacion.test.tsx` / `indicador-progreso-wizard.test.tsx` (6 tests, T-244): estado deshabilitado del paso 1, etiqueta "Continuar a revisión" en el último paso, clic en paso visitado vs. no visitado

---

## Arquitectura hexagonal, Clean Code y documentación ISO

**Arquitectura hexagonal:**
- [x] Ningún archivo en `domain/` o `application/` del módulo `inspeccion` importa `express`, `@prisma/client` ni `multer` (verificado por lectura de los archivos nuevos de este sprint).
- [x] Los 2 casos de uso de este sprint (`iniciar-certificacion`, `responder-certificacion`) reciben sus repositorios por constructor.
- [x] El controlador (`certificacion.controller.ts`) no contiene lógica de negocio — solo parsea, llama al caso de uso y formatea.
- [x] `puedeEditarRespuestas()` y `calcularResumen()` viven en `domain/certificacion.entity.ts`.

**Clean Code:**
- [x] Ninguna función nueva supera ~40 líneas sin extraer auxiliares.
- [ ] **`pnpm lint` — NO verificado**: `apps/api` no tiene script `lint` definido y `apps/web` (`next lint`) nunca se configuró en este proyecto (pide configuración interactiva la primera vez) — gap preexistente de todo el repositorio, no introducido por este sprint. `tsc --noEmit` sí se corrió: 0 errores nuevos en el código de este sprint (los errores existentes son preexistentes de sprints 001/003/004/auth, no tocados aquí).
- [x] Sin código muerto ni `// TODO: implementar` sin resolver en el código de este sprint.
- [x] Los tests describen comportamiento en lenguaje natural (ver nombres de `it(...)` en los archivos de test).

**Documentación ISO (JSDoc):**
- [x] Todas las funciones exportadas de `domain/certificacion.entity.ts` y `domain/evidencia.entity.ts` tienen JSDoc con `@param`, `@returns` y `@example`.
- [x] Todos los métodos de `certificacion.repository.port.ts` tienen JSDoc de una línea mínimo.

---

## Definición de "done" para el sprint

El sprint 015 se considera completo cuando:

1. [~] Todos los ítems de este checklist están marcados ✅ — **con una excepción documentada**: el gate de `pnpm lint` no aplica porque nunca se configuró ESLint en este repositorio (ni en sprints previos); no es una regresión de este sprint.
2. [~] `agente-qa` aprobó el PR con cobertura ≥80% en `domain/`/`application/` (tests unitarios cubren las reglas y casos de uso nuevos) y todos los tests de frontend en verde (93 backend + 116 frontend, con la única excepción preexistente de `strip-resumen-plantilla.test.tsx` de sprint 001, no tocado) — **`pnpm lint` sin errores, sin verificar** (ver nota arriba).
3. [x] Arquitectura hexagonal verificada.
4. [x] JSDoc presente en las entidades de dominio y el puerto nuevo.
5. [~] HU-1 ejecutada de punta a punta **contra la API y el proxy reales** (curl con sesión real): iniciar → responder por secciones → adjuntar evidencia → revisión → resumen. Todas las páginas del wizard cargan (HTTP 200) sin errores en el log del servidor de desarrollo. **No verificado con clics reales en un navegador** (sin herramienta de automatización de browser en esta sesión, mismo límite documentado para 003/004).
6. [x] Documentado en `spec.md`/`task.md`/`impl.md` que la firma digital está pausada en [[005-certificacion-plan-cumplimiento]].
