# Tareas — 015-wizard-certificacion

> Orden de ejecución: Base de datos → API → Frontend → Tests. Cada capa depende de la anterior.
> Numeración `T-200` a `T-244` (mismo rango que tenía cuando este contenido vivía dentro de `005-certificacion-plan-cumplimiento`, antes de separarse en su propia carpeta el 2026-07-16). No colisiona con ningún otro sprint (001 `T-01`–`T-40`, 002 `T-50`–`T-74`, 003 `T-100`–`T-149`, 004 `T-150`–`T-198`, 006 `T-270`–`T-327`, 007 `T-330`–`T-359`, 008 `T-360`–`T-389`, 009 `T-390`–`T-419`, 010 `T-420`–`T-449`, 011 `T-450`–`T-481`, 012 `T-482`–`T-511`, 013 `T-520`–`T-570`, 014 `T-600`–`T-622`).
> Prerrequisito: 001, 002, 003 y 004 ya están implementados. Este sprint reutiliza el editor de árbol de 001 (en modo "responder"), el modelo `Sucursal` de 003 y el alcance de usuario de 004.
> **⚠️ Este sprint es SOLO el formulario (wizard de captura de respuestas).** No incluye firma digital, PDF ni código de verificación — esas tareas se eliminaron de este listado (estaban numeradas T-204, T-215, T-218, T-231, T-237 en la versión original combinada) y quedan **pausadas** en [[005-certificacion-plan-cumplimiento]], que ahora depende de este sprint en vez de al revés. No reintroducir firma aquí sin que el usuario lo pida explícitamente.
> Varios archivos de este sprint se amplían más adelante en [[013-hallazgos-plan-cumplimiento]] y, cuando se retome, en [[005-certificacion-plan-cumplimiento]] (mismo archivo real, sin cambiar la arquitectura de módulos): `inspeccion.errors.ts`, `inspeccion.router.ts`, `modules/inspeccion/index.ts`, `packages/shared/src/types/certificacion.ts`, `sidebar.tsx`, `certificaciones-demo.ts` (seed) y `schema.prisma`. Cada tarea que toca uno de estos archivos lo marca explícitamente.

---

## Agente: `agente-basededatos`

- [x] **T-200** Crear migración `add_certificacion` en `packages/db/prisma/`: `ALTER TABLE inspeccion` agrega **únicamente** `sucursal_id UUID FK sucursal(id) NULLABLE` (nullable para no romper filas históricas sin sucursal) y `periodo_etiqueta VARCHAR(50) NULLABLE`. La columna `establecimiento` (texto libre) se conserva pero se marca `/// @deprecated` en el comentario Prisma — no se elimina físicamente (historial). **No** agrega columnas de firma (`firmado_por_id`, `firmado_en`, `codigo_verificacion`, `pdf_url`, `fecha_vencimiento`, `resultado_final`) — esas se agregan cuando se retome [[005-certificacion-plan-cumplimiento]].
- [x] **T-201** Script de migración de datos (parte de la misma migración o script aparte en `packages/db/sql/migraciones-datos/2026xxxx_emparejar_establecimiento_sucursal.sql`): intenta emparejar `Inspeccion.establecimiento` con `Sucursal.nombre` de la misma `empresaId` por coincidencia exacta case-insensitive; deja `sucursalId = null` en las que no logran emparejar. Documentar cuántas filas quedaron sin emparejar en `memoria/cambios_db/registro.md` para revisión manual posterior.
- [x] **T-202** Índice: `inspeccion(sucursal_id)`.
- [x] **T-203** Ampliar `packages/db/prisma/schema.prisma` (AMPLIAR): agregar a `model Inspeccion` los campos `sucursalId`/`periodoEtiqueta` de T-200 y la relación `sucursal`. Documentar en un comentario que la relación `firmadoPor` y los campos de firma se agregan cuando se retome [[005-certificacion-plan-cumplimiento]], y que las relaciones inversas `Inspeccion.hallazgos`/`Inspeccion.planCumplimiento` se agregan en 013.
- [x] **T-206** Registrar el cambio (columnas nuevas de `inspeccion`, índice) en `memoria/cambios_db/registro.md`.
- [x] **T-207** Confirmar con `memoria/sprint/auth.md` que `Usuario.clienteId` y `Usuario.sucursalId` (de 003/004) ya existen en el schema antes de que `agente-backend` escriba los queries de alcance de este sprint; si no existen todavía, documentar el bloqueo ahí en vez de asumirlos.

---

## Agente: `agente-backend`

- [x] **T-208** Crear `apps/api/src/modules/inspeccion/domain/evidencia.entity.ts` — funciones puras compartidas por las tablas de evidencia (esta parte solo usa `InspeccionEvidencia`; 013 reutiliza este archivo para `HallazgoEvidencia`/`AccionCorrectivaEvidencia`): `tipoArchivoPermitido(mime: string): boolean` (jpg/png/heic/pdf/doc/docx), `tamanoArchivoValido(bytes: number): boolean` (≤ 10 MB), `construirRutaAlmacenamiento(empresaId, inspeccionId, detalleId, archivo): string` según la convención `certificaciones/{empresaId}/{inspeccionId}/{detalleId}/{archivo}` de `spec.md`.
- [x] **T-209** Crear `domain/certificacion.entity.ts`: `puedeEditarRespuestas(certificacion): boolean` (`estado === "EN_PROGRESO"` — en este sprint es siempre `true` porque no existe otro estado todavía, pero se define igual para que 005 lo reutilice sin cambiar su firma) y `calcularResumen(detalles: InspeccionDetalle[], puntajeMaximoPlantilla: number): { puntajeObtenido, puntajeMaximo, porcentajeCumplimiento, clasificacion }` — cálculo puro de solo lectura para el paso de revisión, sin persistir nada ni requerir stored procedure (no hay transacción de firma que lo dispare en este sprint). **No incluye** `puedeFirmarse`, `generarCodigoVerificacion` ni `calcularFechaVencimiento` — esas funciones se agregan cuando se retome [[005-certificacion-plan-cumplimiento]].
- [x] **T-210** Crear `domain/certificacion.repository.port.ts`: `iniciar`, `obtenerCompleta`, `listar(filtroAlcance)`, `guardarRespuestasSeccion(inspeccionId, seccionId, respuestas)`. **No incluye** `firmar` ni `obtenerPorCodigoVerificacion`.
- [x] **T-211** Crear `domain/inspeccion.errors.ts` (o ampliar si ya existe con errores de 001/003) con los errores de esta parte: `CertificacionNoEditableError`, `SucursalRequeridaError`, `SucursalFueraDeAlcanceError`, `ArchivoNoPermitidoError`. **No incluye** `CodigoVerificacionEnColisionError` (pertenece a 005, pausado). Documentar que 013 amplía este mismo archivo con los errores de hallazgos/plan/acciones.
- [x] **T-212** Crear `application/certificacion.schema.ts` (Zod): `iniciarCertificacionSchema` (`plantillaId`, `sucursalId`, `periodoEtiqueta` requeridos), `guardarRespuestasSeccionSchema` (`seccionId` + array de `{ nodoId, valor?, valores?, comentario? }`). **No incluye** `firmarCertificacionSchema`.
- [x] **T-213** Crear caso de uso `application/casos-uso/iniciar-certificacion.usecase.ts`: valida plantilla activa y vigente (`puedeIniciarInspeccion`, ya existente), valida sucursal activa y dentro del alcance del usuario (según 004), crea `Inspeccion` en `EN_PROGRESO` con snapshot de `plantillaVersion`.
- [x] **T-214** Crear caso de uso `application/casos-uso/responder-certificacion.usecase.ts`: `guardarRespuestasSeccion` (upsert batch de `InspeccionDetalle` acotado a los `nodoId` de una sección, mismo snapshot de ruta/título/criterio que ya implementa el modelo actual), `adjuntarEvidenciaRespuesta`, `obtenerResumen` (usa `calcularResumen` de T-209 para el paso de revisión). Lanza `CertificacionNoEditableError` si `estado !== "EN_PROGRESO"`.
- [x] **T-216** Crear `infrastructure/certificacion.prisma-repository.ts`: implementa el puerto (sin `firmar`); `listar()` aplica el filtro de alcance (`sucursalId`/`clienteId`/alcance total) según lo que exponga el módulo `auth` de 004.
- [x] **T-217** Crear `infrastructure/almacenamiento-evidencias.adapter.ts`: wrapper sobre Supabase Storage (`subirArchivo(ruta, buffer, mime)`, `obtenerUrlFirmada(ruta)`), usado por el controlador de evidencia de certificación. Valida tipo/tamaño con `domain/evidencia.entity.ts` antes de subir. 013 reutiliza este mismo adaptador para hallazgo/acción correctiva sin duplicarlo.
- [x] **T-219** Crear `infrastructure/certificacion.controller.ts` — traduce HTTP↔caso de uso (iniciar, listar, obtener, guardar respuestas por sección, subir evidencia, obtener resumen); los endpoints de evidencia usan el middleware de subida de T-222. **No incluye** handler de firmar ni de descarga de PDF.
- [x] **T-220** Ampliar `infrastructure/inspeccion.router.ts` (AMPLIAR) con los endpoints de certificaciones de este sprint (iniciar, listar, obtener, guardar respuestas de una sección, subir evidencia, obtener resumen) — ver el listado completo en `impl.md` → "Contrato de API". Los endpoints de firmar/PDF se agregan cuando se retome 005.
- [x] **T-221** Actualizar `modules/inspeccion/index.ts` (AMPLIAR) (`crearModuloInspeccion`) para instanciar e inyectar el repositorio/caso de uso/controlador de certificación.
- [x] **T-222** Crear middleware compartido `apps/api/src/shared/middleware/subida-archivo.middleware.ts` (usa `multer`, límite 10 MB, tipos permitidos jpg/png/heic/pdf/doc/docx) — vive en `shared/` por ser transversal (dueño: `agente-backend`, ver alcance en `CLAUDE.md`). 013 reutiliza este mismo middleware para hallazgo/acción correctiva.
- [x] **T-223** Crear Route Handlers proxy Next.js en `apps/web/src/app/api/inspeccion/certificaciones/` (iniciar/listar, obtener, respuestas por sección, evidencias, resumen) — ver árbol completo en `impl.md`. Los endpoints con `multipart/form-data` (evidencias) reenvían el cuerpo crudo sin parsearlo.

---

## Agente: `agente-frontend`

- [x] **T-224** Agregar tipos en `packages/shared/src/types/certificacion.ts`: `Certificacion` (extiende los campos ya existentes de `Inspeccion`/`PlantillaCompleta` con `sucursalId`, `periodoEtiqueta` **únicamente** — sin campos de firma). Re-exportar desde `packages/shared/src/index.ts`. Documentar que [[005-certificacion-plan-cumplimiento]] amplía este mismo archivo (AMPLIAR) agregando `firmadoPorId`, `firmadoEn`, `codigoVerificacion`, `pdfUrl`, `fechaVencimiento`, `resultadoFinal` cuando se retome, y que 013 lo amplía con `Hallazgo`/`PlanCumplimiento`/`AccionCorrectiva`.
- [x] **T-225** Agregar ítem "Certificaciones" a `apps/web/src/app/(dashboard)/_components/sidebar.tsx` (AMPLIAR) con sub-ítem "Nueva certificación" (`/certificaciones/nueva`). 013 agrega los sub-ítems "Mis acciones" y "Verificación" al mismo grupo.
- [x] **T-226 — DESVIACIÓN DE DISEÑO (decidida en la implementación, 2026-07-18)**: en vez de generalizar `tabla-ficha.tsx`/`fila-seccion.tsx`/`fila-pregunta.tsx` de 001 con un prop `modo`, se crearon componentes **nuevos y dedicados** en `certificaciones/_components/` (`seccion-wizard.tsx`, `pregunta-wizard.tsx`) que recorren el árbol de una sola sección de nivel 0, con el mismo lenguaje visual pero sin tocar el editor de estructura ya probado (menor riesgo de regresión). `RespuestaWidget` se extrajo a `certificaciones/_components/respuesta-widget.tsx` (no a `inspecciones/_components/`), adaptado a `NodoArbol`/`NodoOpcion` reales. Ver nota en `impl.md`.
- [x] **T-227** Eliminar `apps/web/.../inspecciones/[id]/ejecutar/page.tsx` (placeholder obsoleto: usa el shape `apartados/subapartados/preguntas` que ya no coincide con `NodoArbol`) — su funcionalidad se reemplaza por T-232.
- [x] **T-228** Crear `apps/web/.../certificaciones/_servicios/certificacion.servicio.ts`: `iniciarCertificacion`, `listarCertificaciones`, `obtenerCertificacion`, `guardarRespuestasSeccion`, `subirEvidenciaRespuesta`, `obtenerResumenCertificacion`. **No incluye** `firmarCertificacion` ni `obtenerUrlPdf`.
- [x] **T-229** Crear hook `_hooks/usar-iniciar-certificacion.ts`: estado del selector Cliente→Sucursal→Período (reutiliza el servicio de sucursales de 003), acción "Iniciar formulario" que redirige a `/certificaciones/[id]/responder`.
- [x] **T-230** Crear hook `_hooks/usar-responder-certificacion.ts`: carga certificación completa + árbol de nodos, guardado incremental **por sección** (recibe `seccionId` y guarda solo las respuestas de esa sección), progreso global (`secciones respondidas / total`) y progreso por sección, sube evidencias. Es el hook de **datos**; la navegación entre pasos vive en T-240.
- [x] **T-231** Crear hook `_hooks/usar-revision-certificacion.ts` (⭐ sin firma — reemplaza al antiguo `usar-revision-firma.ts` de la versión combinada): carga el resumen (`obtenerResumenCertificacion`, puntaje/clasificación por sección), deriva `haySeccionesIncompletas`, acción `guardarYFinalizar()` que simplemente confirma y navega a la lista de certificaciones (no cambia `estado`, no genera PDF ni código). Cuando se retome [[005-certificacion-plan-cumplimiento]], ese sprint puede reemplazar esta acción por una que sí firme, sin cambiar la forma del hook para el resto de la pantalla.
- [x] **T-240 (⭐ wizard)** Crear hook `_hooks/usar-wizard-certificacion.ts`: estado `pasoActual` (`1..N` = una por sección de nivel 0 de la plantilla vigente, en el mismo orden que el editor de 001; `N+1` = paso de revisión) y `pasosVisitados: Set<number>`. Deriva `totalPasos`, `seccionActual` (nodo de nivel 0 correspondiente a `pasoActual`), `esUltimoPaso`. Acciones: `avanzar()` (llama a `guardarRespuestasSeccion` de T-230 para el paso actual, marca el paso como visitado, incrementa `pasoActual`; si `esUltimoPaso` navega a `certificaciones/[id]/revision`), `retroceder()` (decrementa sin guardar de nuevo), `irAPaso(n)` (solo permite saltar a un paso ya presente en `pasosVisitados` o al inmediatamente siguiente al mayor visitado — no se puede saltar hacia adelante sin pasar por los pasos intermedios la primera vez). No persiste `pasoActual`/`pasosVisitados` en BD — se recalculan al recargar a partir de qué secciones ya tienen respuestas guardadas (`InspeccionDetalle` existente por sección).
- [x] **T-241 (⭐ wizard)** Crear componente `_components/wizard-certificacion.tsx`: shell del wizard — barra de progreso fija en la parte superior (usa `_components/indicador-progreso-wizard.tsx` de T-242), título de la sección actual, slot para el contenido del paso (recibe `children`), botones "Anterior" (deshabilitado en el paso 1) y "Siguiente"/"Continuar a revisión" (este último solo en el último paso, navega a la revisión). Consume `usar-wizard-certificacion` (T-240).
- [x] **T-242 (⭐ wizard)** Crear componente `_components/indicador-progreso-wizard.tsx`: barra de pasos tipo stepper — cada paso es clicable si está en `pasosVisitados` (navega directo vía `irAPaso`), muestra el paso actual resaltado y los pasos futuros no alcanzados en estado deshabilitado/gris. Prop genérica `{ pasos: { numero, titulo, visitado, completo }[], pasoActual, onIrAPaso }` — sin lógica de negocio, reutilizable.
- [x] **T-232** Crear página `certificaciones/[id]/responder/page.tsx` (Wizard, Pasos 1..N): usa `WizardCertificacion` (T-241) envolviendo `TablaFicha modo="responder" seccionId={seccionActual.id}` (T-226) sobre los hooks de T-230 + T-240. Reemplaza al placeholder eliminado en T-227.
- [x] **T-233** Crear página `certificaciones/nueva/page.tsx` (Wizard, Paso 0): selector Cliente→Sucursal→Período + botón "Iniciar formulario" → crea la `Inspeccion` y redirige a `certificaciones/[id]/responder` (arranca en el paso 1).
- [x] **T-234** Crear página `certificaciones/[id]/revision/page.tsx` (Wizard, paso final, ⭐ sin firma): resumen puntaje/clasificación **por sección** (indica cuáles quedaron sin responder, si alguna), botón "Guardar y finalizar" (T-231 — no firma, no genera PDF). Botón "Volver a una sección" regresa al wizard de T-232 en el paso correspondiente si el usuario quiere corregir algo.

---

## Agente: `agente-qa` — Tests de unidad Backend

> Herramienta: **Vitest**. Dominio puro sin mocks. Casos de uso con mock del repositorio. Sin Express, sin Prisma.

- [x] **T-235** `certificacion.entity.test.ts`:
  - `puedeEditarRespuestas` con `estado = EN_PROGRESO` → `true`
  - `calcularResumen([], puntajeMaximoPlantilla)` con detalles vacíos → `puntajeObtenido: 0`
  - `calcularResumen(detalles, ...)` con detalles de varias secciones → suma correcta de `puntajeObtenido`/`puntajeMaximo` y `porcentajeCumplimiento` calculado, `clasificacion` resuelta contra los rangos de la plantilla

- [x] **T-236** `iniciar-certificacion.usecase.test.ts` y `responder-certificacion.usecase.test.ts` (mock del repositorio):
  - `iniciar()` con plantilla inactiva → lanza error (reutiliza `puedeIniciarInspeccion`)
  - `iniciar()` con sucursal fuera del alcance del usuario → `SucursalFueraDeAlcanceError`
  - `iniciar()` exitoso llama `repo.iniciar()` con `plantillaVersion` congelada
  - `guardarRespuestasSeccion()` llama `repo.guardarRespuestasSeccion()` solo con los `nodoId` de la sección indicada, con el snapshot correcto
  - `obtenerResumen()` llama `calcularResumen()` con los detalles cargados y retorna el resultado

- [x] **T-238 — verificado manualmente vía curl contra la API real (2026-07-20), no como archivo de test automatizado**: `POST /inspeccion/certificaciones` → `PATCH /inspeccion/certificaciones/:id/respuestas` (por sección) → `POST .../evidencias` (multipart, también a través del proxy Next.js) → `GET .../resumen` — puntaje/porcentaje/clasificación correctos, `estado` se mantiene `EN_PROGRESO`. También verificado: 401 sin token, 400 sin `sucursalId`, 422 archivo no permitido. Pendiente si se quiere un test de integración automatizado permanente (no bloqueante para el sprint).

---

## Agente: `agente-qa` — Tests de unidad Frontend

> Herramienta: **Vitest + React Testing Library**. Servicios y API mockeados, sin llamadas reales de red.

- [x] **T-239** `usar-responder-certificacion.test.ts` y `usar-revision-certificacion.test.ts`:
  - `usar-responder-certificacion`: `progresoGlobal` se recalcula al guardar la respuesta de una sección
  - `usar-revision-certificacion`: `haySeccionesIncompletas` es `true` si alguna sección tiene menos respuestas que preguntas; `guardarYFinalizar()` navega a la lista de certificaciones sin llamar ningún endpoint de firma
- [x] **T-243 (⭐ wizard)** `usar-wizard-certificacion.test.ts`:
  - `pasoActual` inicia en `1` (o en el primer paso sin `InspeccionDetalle` guardado, si se recarga a mitad de wizard)
  - `avanzar()` marca el paso actual como visitado y lo incrementa
  - `avanzar()` en el último paso (`esUltimoPaso = true`) navega a la revisión en vez de incrementar `pasoActual`
  - `irAPaso(n)` con `n` ya visitado → navega; con `n` no visitado y no inmediato siguiente → no hace nada (no permite saltar hacia adelante)
  - `retroceder()` decrementa `pasoActual` sin volver a llamar al servicio de guardado
- [x] **T-244 (⭐ wizard)** `wizard-certificacion.test.tsx` e `indicador-progreso-wizard.test.tsx`:
  - El botón "Anterior" está deshabilitado en el paso 1
  - El botón dice "Siguiente" en pasos intermedios y "Continuar a revisión" en el último paso
  - Clic en un paso visitado de la barra de progreso llama `onIrAPaso(n)`
  - Clic en un paso no visitado (más allá del siguiente inmediato) no llama `onIrAPaso`
  - El paso actual se resalta visualmente (clase/atributo distinto a los demás)

---

## Dependencias entre tareas

```
T-200, T-201 → T-202 → T-203 → T-206
T-207 → T-216                            ← alcance de usuario (003/004) requerido para el repo con filtro

T-203 → T-208, T-209                     ← entidades de dominio necesitan los campos ya definidos
T-208 → T-217
T-209 → T-210 → T-212 → T-213, T-214
T-211 → T-213, T-214
T-216 → T-219
T-217 → T-219
T-219 → T-220 → T-221 → T-223
T-222 → T-219                            ← middleware de subida antes del controlador de evidencia

T-223 → T-224 → T-225
T-223 → T-228
T-226 → T-227
T-228 → T-229, T-230, T-231
T-229 → T-233
T-230 → T-240                            ← el hook de wizard orquesta el hook de datos
T-227, T-226, T-240 → T-241 → T-242
T-241 → T-232
T-231 → T-234

T-209 → T-235
T-213, T-214 → T-236
T-220 → T-238
T-232, T-234 → T-239
T-240 → T-243
T-241, T-242 → T-244
```
