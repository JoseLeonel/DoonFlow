# Checklist de aceptación — 008-reportes-analytics

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador, en un archivo descargado o en un test. "Está escrito" no es suficiente.
> **Verificado 2026-07-21** vía curl contra la API real + proxy Next.js (con cookie de sesión real) y suites de test (157 backend / 165 frontend). **No verificado con clics reales en un navegador** (mismo límite que 003/004/007/010/015). **Alcance reducido por decisión explícita del usuario** (ver `memoria/decisiones.md`, 2026-07-21): sin `hallazgosAbiertos`/`estadoPlanCumplimiento` (013 bloqueado) ni `certificacionVigente`/`certificacionVencida` (005 pausado, sin `fechaVencimiento`) — los reportes de este sprint usan solo `puntajeObtenido`/`porcentajeCumplimiento`/`clasificacion` de `Inspeccion` tal como existe hoy. Varias rutas reales difieren del spec original (`/analytics/reportes` no `/configuracion/reportes`, sin panel ejecutivo previo que extender) — ver `impl.md` para el detalle completo de las desviaciones.

---

## Base de datos

- [x] La migración `add_reportes_generados` aplica sin errores (`pnpm --filter db migrate:dev`).
- [x] La tabla `reporte_generado` existe con las columnas: `id`, `empresa_id`, `tipo`, `filtros`, `formato`, `url`, `generado_por_id`, `creado_en`.
- [x] Los índices `(empresa_id, creado_en DESC)` y `(empresa_id, tipo)` existen (`\d reporte_generado` en psql).
- [~] **Alcance reducido**: el índice de soporte real (`inspeccion(sucursal_id, fecha_inicio)`) sí existe — los índices sobre `inspeccion(sucursal_id, estado, firmado_en)`, `inspeccion(empresa_id, fecha_vencimiento)`, `hallazgo(inspeccion_id, severidad)` y `accion_correctiva(plan_cumplimiento_id, estado)` del spec original no aplican porque esas columnas/tablas no existen todavía (005/013). Ver `memoria/decisiones.md`.
- [x] La decisión sobre stored procedure vs. query directa (T-363) quedó registrada en `memoria/decisiones.md`.
- [x] La entrada en `memoria/cambios_db/registro.md` describe el cambio completo (tabla, índices, decisión de SP).

---

## API — Generación y descarga de reportes

- [x] `POST /reportes` con `tipo: "CONSOLIDADO_CLIENTE"` crea el `ReporteGenerado` y retorna `{ data: { reporte, urlDescarga } }`.
- [x] `POST /reportes` con `tipo: "COMPARATIVO_SUCURSALES"` y `sucursalIds` crea el reporte comparativo.
- [x] `POST /reportes` con `formato: "EXCEL"` genera un archivo `.xlsx` descargable y abrible (validar apertura real, no solo que el endpoint responda 201).
- [x] `POST /reportes` con `formato: "PDF"` genera un archivo `.pdf` descargable y abrible.
- [x] `POST /reportes` sin `fechaDesde`/`fechaHasta` retorna 400.
- [x] `POST /reportes` con `tipo: "COMPARATIVO_SUCURSALES"` sin `sucursalIds` retorna 400.
- [x] `POST /reportes` de un `administrador_cliente` con `clienteId` distinto al suyo retorna 403 con `codigo` descriptivo (`cliente_fuera_de_alcance`).
- [x] `POST /reportes` de un `usuario_sucursal` retorna 403 (sin acceso al módulo, regla de negocio 1 del spec).
- [x] `GET /reportes` retorna el historial paginado `{ data: [...], meta: { total, pagina, porPagina } }`.
- [x] `GET /reportes?tipo=CONSOLIDADO_CLIENTE` filtra correctamente.
- [x] `GET /reportes` de un `administrador_cliente` solo retorna reportes cuyo `filtros.clienteId` es el suyo, aunque existan reportes de otros clientes en la misma empresa tenant.
- [x] `GET /reportes/:id/descargar` retorna una URL válida del reporte ya generado sin regenerarlo — verificado por curl con el reporte propio. El bloqueo por alcance (`usuario_sucursal` siempre, `administrador_cliente` con reporte de otro cliente) está verificado por tests unitarios de `obtenerParaDescarga()`, no repetido por curl.
- [ ] **No implementado**: `GET /reportes/:id` (detalle individual) — el spec lo listaba en el contrato de API, pero el frontend no lo necesita (el historial ya trae todos los campos inline) y se recortó por alcance/tiempo. `GET /reportes/:id/descargar` sí existe y cubre el caso de uso real.
- [x] Todas las rutas retornan 401 sin token.

---

## API — Vista previa (preview)

- [x] `GET /reportes/consolidado-cliente/preview?clienteId=&fechaDesde=&fechaHasta=` retorna los datos agregados sin crear ningún `ReporteGenerado` ni archivo.
- [x] `GET /reportes/comparativo-sucursales/preview?clienteId=&sucursalIds=&fechaDesde=&fechaHasta=` retorna una fila por sucursal solicitada.
- [x] Ambos endpoints de preview aplican el mismo filtrado de alcance que `POST /reportes` (un `administrador_cliente` no puede previsualizar datos de otro cliente aunque fuerce el parámetro `clienteId` en la URL).

---

## Frontend — Generar reporte (`/analytics/reportes/nuevo`)

- [x] El formulario muestra selector de tipo (Consolidado por cliente / Comparativo entre sucursales), cliente(s), rango de fechas y formato (Excel/PDF).
- [x] El selector de cliente respeta el alcance del usuario ([[004-usuarios-roles-alcance]]): un `administrador_cliente` no ve selector de cliente, ve el suyo fijo.
- [x] Con `tipo = "COMPARATIVO_SUCURSALES"` aparece el selector múltiple de sucursales del cliente elegido.
- [x] El botón "Generar" permanece deshabilitado hasta completar los filtros obligatorios.
- [x] Antes de exportar, se muestra la vista previa en pantalla (tabla del consolidado o tabla comparativa) — ver sección siguiente.
- [x] Al hacer clic en "Generar y descargar", el archivo se descarga en el formato elegido sin recargar la página.
- [x] Mientras se genera el reporte, el botón muestra spinner y queda deshabilitado.
- [x] Si el API retorna error (por ejemplo alcance denegado), se muestra el mensaje bajo el formulario.

---

## Frontend — Vista comparativa/previa antes de exportar

- [x] Al cambiar cualquier filtro del formulario, la vista previa se invalida y debe recargarse antes de permitir exportar (no se exporta con datos desactualizados sin confirmarlo).
- [~] **Alcance reducido** (ver nota al inicio del checklist): la vista previa del consolidado muestra sucursales del cliente, certificaciones del período y puntaje/clasificación — **sin** `hallazgosAbiertos` ni `estadoPlanCumplimiento` (013 bloqueado por 005).
- [~] **Alcance reducido**: la vista previa comparativa muestra puntaje, % de cumplimiento y clasificación por sucursal — **sin** "certificación vigente/vencida" (requiere `fechaVencimiento` de 005, pausado). En su lugar muestra `tieneCertificacionEnPeriodo` (Sí/No).
- [x] Una sucursal sin certificación en el período muestra `—` en puntaje y "○ No" en la columna de certificación — no una fila vacía ni un error. Verificado por test (`vista-previa-comparativo.test.tsx`).
- [ ] **No aplica en este sprint**: no existe el estado "Vencida" en el alcance reducido (depende de `fechaVencimiento`, 005 pausado) — solo "○ No" (sin certificación en el período) en gris neutro, mismo token que el resto del proyecto para estados sin dato.
- [x] Mientras se carga la vista previa, se muestra un estado de carga (skeleton o spinner), no una tabla vacía.

---

## Frontend — Historial de reportes (`/analytics/reportes`)

- [x] La tabla carga con datos reales del API (no mock).
- [x] Columnas visibles: Tipo, Filtros (resumen legible), Formato, Generado por, Fecha, Acción "Descargar".
- [x] El filtro por Tipo funciona sin recargar la página.
- [x] El botón "Descargar" de cada fila descarga el archivo ya generado sin volver a calcular los datos (verificar que no dispara una llamada a los endpoints de preview ni a `POST /reportes`).
- [x] Se muestran 5 filas skeleton mientras el API responde.
- [x] Con historial vacío se muestra estado vacío con texto y enlace a "Generar reporte".
- [x] Si el API falla, se muestra mensaje de error.
- [x] El breadcrumb (o navegación) permite volver al panel ejecutivo de `/analytics`.

---

## Frontend — Landing de Analytics (`/analytics`)

- [~] **Desviación real**: T-382 pedía "actualizar el panel ejecutivo existente de sprint 006" — ese panel **nunca se implementó** (014-panel-calendario-biblioteca sigue sin código, confirmado en `memoria/estado.md`; `/analytics` no existía). Se creó una página `/analytics` nueva (no una actualización) con los 2 accesos pedidos, en vez de extender algo inexistente.
- [x] `/analytics` muestra un acceso "Generar reporte" hacia `/analytics/reportes/nuevo` — verificado por curl (HTTP 200).
- [x] `/analytics` muestra un acceso "Ver historial de reportes" hacia `/analytics/reportes` — verificado por curl (HTTP 200).
- [x] Ningún otro elemento del panel ejecutivo de sprint 006 fue modificado o rediseñado por este sprint.

---

## Reglas de negocio verificadas

- [x] Un `administrador_cliente` solo puede generar/consultar reportes de su propio `clienteId` — verificado en backend, no solo oculto en el frontend.
- [x] Un `usuario_sucursal` no tiene acceso al módulo de reportes (ni a generar ni a listar historial).
- [x] Los reportes generados no se eliminan físicamente — no existe ningún endpoint ni botón de eliminar reporte en este sprint.
- [x] El contenido del reporte respeta el alcance del usuario aunque se fuercen parámetros de filtro fuera de su alcance vía query string o body (regla de negocio 3 del spec).
- [x] Regenerar un reporte con los mismos filtros crea una **nueva** fila en el historial (no sobrescribe la anterior) — el historial preserva qué se generó y cuándo.
- [x] El `empresaId` de la sesión es siempre el que se usa; no hay campo de empresa en ningún formulario de este módulo.

---

## Tests de unidad — Backend (`agente-qa`)

**`reporte.entity.test.ts`:**
- [x] `construirResumenFiltros()` con un cliente y rango de fechas → texto legible esperado
- [x] `construirResumenFiltros()` con comparativo de varias sucursales → incluye la cantidad de sucursales
- [x] `puedeGenerarReporte("administrador", ...)` → `true` para cualquier cliente
- [x] `puedeGenerarReporte("administrador_cliente", ...)` → `true` solo si el `clienteId` solicitado coincide con el propio
- [x] `puedeGenerarReporte("usuario_sucursal", ...)` → `false` siempre

**`generar-reporte.usecase.test.ts`:**
- [x] `generar()` lanza `ClienteFueraDeAlcanceError` si `administrador_cliente` pide un cliente ajeno
- [x] `generar()` lanza `AccesoModuloReportesDenegadoError` para `usuario_sucursal`
- [x] `generar()` con `formato: "EXCEL"` llama solo al `GeneradorExcelPort`
- [x] `generar()` con `formato: "PDF"` llama solo al `GeneradorPdfPort`
- [x] `generar()` guarda `filtros` como snapshot exacto del input
- [x] `generar()` retorna la `url` provista por `ReporteStoragePort`
- [x] `obtenerPreviewComparativo()` no crea ningún `ReporteGenerado` ni llama a los generadores de archivo
- [x] `ListarHistorialReportesUseCase.listar()` filtra por `clienteId` propio cuando el rol es `administrador_cliente`
- [x] `ListarHistorialReportesUseCase.obtenerParaDescarga()` lanza `ReporteNoEncontradoError` si el reporte está fuera de alcance

**Test de integración — [~] NO escrito como suite automatizada** (mismo gap ya documentado en 010: no existe infraestructura de "BD de pruebas" separada de `doonflow_dev`). Verificado manualmente por curl en su lugar: `POST /reportes` (`formato: EXCEL` y `formato: PDF`) → `GET /reportes` retorna ambos en el historial con `url` no vacía y `resumenFiltros` resuelto; los archivos descargados son un `.xlsx` válido (`file` los identifica como "Microsoft Excel 2007+") y un `.pdf` válido (header `%PDF-`).

---

## Tests de unidad — Frontend (`agente-qa`)

**`formulario-generar-reporte.test.tsx`:**
- [x] Botón "Generar" deshabilitado sin `clienteId`
- [x] Botón "Generar" deshabilitado sin rango de fechas completo
- [x] Con `tipo = COMPARATIVO_SUCURSALES` sin sucursales seleccionadas, botón deshabilitado
- [~] **Adaptado**: el componente final es completamente controlado (sin estado interno) para evitar un bug de sincronización con el hook — no existe un único callback genérico `onCambiarFiltros`, sino un `onChange` por campo (`onTipoChange`, `onClienteIdChange`, etc.); la invalidación del preview vive en el hook (`usarGenerarReporte.previewDesactualizado`), no en el formulario. Test real: "cambiar el cliente llama a onClienteIdChange".
- [x] Clic en "Generar" con filtros válidos llama `onGenerar` (sin argumentos — el componente es controlado, el estado ya vive en el padre)

**`tabla-historial-reportes.test.tsx`:**
- [x] `reportes = []` → estado vacío
- [x] Con reportes → filas con Tipo, Filtros, Formato, Generado por, Fecha
- [x] Botón "Descargar" llama `onDescargar(id)`
- [x] `cargando = true` → skeleton

**`vista-previa-comparativo.test.tsx`:**
- [x] Renderiza una columna por sucursal en `datos.filas`
- [x] Sucursal sin certificación en el período → `—` en puntaje, "○ No" en gris neutro
- [ ] **No aplica** — "certificación vencida" no existe en el alcance reducido de este sprint (ver nota al inicio). El equivalente probado es "● Sí" (verde) / "○ No" (gris) según `tieneCertificacionEnPeriodo`.

---

## Arquitectura hexagonal y Clean Code

- [x] Ningún archivo en `domain/` o `application/` del módulo `reportes` importa `express`, `@prisma/client` ni la librería concreta de Excel/PDF.
- [x] `GenerarReporteUseCase` y `ListarHistorialReportesUseCase` reciben sus dependencias (repositorio, generadores, storage) por constructor.
- [x] `GeneradorExcelPort` y `GeneradorPdfPort` viven en `domain/`; sus implementaciones concretas viven únicamente en `infrastructure/`.
- [x] Los controladores no contienen lógica de negocio ni de alcance — solo parsean request, llaman al caso de uso y formatean la respuesta.
- [x] `puedeGenerarReporte()` y `construirResumenFiltros()` están en `domain/reporte.entity.ts`, no en el controlador ni en el repositorio.
- [ ] **`pnpm lint` — NO verificado**: mismo gap preexistente de todo el repositorio ya documentado en 007/010/015 (ni `apps/api` ni `apps/web` tienen ESLint configurado). `tsc --noEmit` sí se corrió limpio en ambos: 0 errores nuevos (los únicos preexistentes son los 3 archivos ya documentados de sprint 001). Se encontró y corrigió de paso una inconsistencia real preexistente: `packages/ui` declaraba `@types/react: ^19.0.0` mientras el resto del monorepo usa `^18.3.0`, causando un choque de tipos `ReactNode` duplicados al usarse desde `apps/web` — corregido alineando la versión.

---

## Definición de "done" para el sprint

El sprint 008 se considera completo cuando:

1. [~] Todos los ítems de este checklist están marcados ✅ — con las excepciones documentadas puntualmente arriba: alcance reducido sin hallazgos/plan de cumplimiento/vigencia (decisión explícita del usuario, 005/013 bloqueados), `GET /reportes/:id` no implementado, panel ejecutivo de 006 nunca existió (se creó `/analytics` nuevo), `pnpm lint` sin verificar (gap preexistente del repo), tests de integración no automatizados (verificados por curl).
2. [~] `agente-qa` aprobó el PR con:
   - Todos los tests de backend y frontend pasan en verde — 157 backend (+17 nuevos) / 165 frontend (+12 nuevos), con la única excepción preexistente de `strip-resumen-plantilla.test.tsx` (sprint 001).
   - `pnpm lint` sin errores — sin verificar (ver nota arriba). `tsc --noEmit` limpio en ambos paquetes.
3. [x] Arquitectura hexagonal verificada: ningún archivo de `domain/` o `application/` del módulo `reportes` importa Express, Prisma ni `exceljs`/`pdfkit`.
4. [x] La decisión de librería (`exceljs` + `pdfkit`) y el alcance reducido quedaron registrados en `memoria/decisiones.md` (entrada 2026-07-21) antes de implementar T-372.
5. [~] La historia de usuario se ejecuta de punta a punta **contra la API y el proxy reales** (curl con sesión real, incluyendo a través del proxy Next.js): generado un reporte consolidado por cliente en PDF y otro en Excel, un comparativo entre sucursales en PDF — los 3 aparecen en el historial con `resumenFiltros` resuelto y se descargan sin regenerarse (archivos `.xlsx`/`.pdf` validados como binarios reales, no solo HTTP 200). Verificado el bloqueo de acceso: `administrador_cliente` con cliente ajeno → 403; `usuario_sucursal` → 403 en historial (bug real encontrado y corregido en esta misma sesión — el historial no bloqueaba a `usuario_sucursal` originalmente). **No verificado con clics reales en un navegador.**
