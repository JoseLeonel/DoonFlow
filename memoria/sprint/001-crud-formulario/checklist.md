# Checklist de aceptación — 001-crud-formulario

> Un ítem no se marca ✅ hasta que el comportamiento es verificable en el navegador o en un test. "Está escrito" no es suficiente.

---

## Base de datos

- [ ] La migración `add_inspecciones` aplicada sin errores en el entorno local.
- [ ] Las tablas `plantilla_inspeccion`, `nodo_inspeccion`, `nodo_opcion`, `rango_resultado` existen con las columnas esperadas.
- [ ] Las columnas opcionales de PREGUNTA aceptan NULL (verificar con un nodo PANEL insertado).
- [ ] Los índices de rendimiento existen (`\d nodo_inspeccion` en psql).

---

## API — Plantillas (cabecera)

- [ ] `POST /inspeccion/plantillas` crea la plantilla y retorna `{ data: Plantilla }` con `id` generado.
- [ ] `GET /inspeccion/plantillas` retorna lista paginada con `{ data: [...], meta: { total, pagina, porPagina } }`.
- [ ] `GET /inspeccion/plantillas?activa=true` filtra correctamente.
- [ ] `GET /inspeccion/plantillas/:id` retorna la plantilla con `nodos` y `rangosResultado`.
- [ ] `PATCH /inspeccion/plantillas/:id` actualiza solo los campos enviados.
- [ ] `PATCH /inspeccion/plantillas/:id/estado` con `{ activa: false }` desactiva; con `{ activa: true }` activa.
- [ ] `DELETE /inspeccion/plantillas/:id` elimina y retorna 204.
- [ ] `POST /inspeccion/plantillas/:id/clonar` crea copia inactiva con nuevo nombre y todos sus nodos.
- [ ] Todas las rutas retornan 401 sin token y 403 si el rol no es administrador.
- [ ] Intentar acceder a una plantilla de otra empresa retorna 404 (aislamiento multiempresa).

---

## API — Nodos

- [ ] `POST /inspeccion/plantillas/:id/nodos` con `tipo: PANEL` crea un nodo sin campos de PREGUNTA.
- [ ] `POST /inspeccion/plantillas/:id/nodos` con `tipo: PREGUNTA` acepta y guarda `tipoRespuesta`, `modalidadPuntaje`, `reglaComentario`, `evidenciaObligatoria`.
- [ ] `POST` con `padreId` válido incrementa el `nivel` correctamente (hijo de nivel 0 → nivel 1).
- [ ] `PATCH /inspeccion/plantillas/:id/nodos/:nodoId` actualiza solo los campos enviados.
- [ ] `DELETE /inspeccion/plantillas/:id/nodos/:nodoId` elimina el nodo y todos sus hijos en cascada.
- [ ] `PATCH .../nodos/reordenar` con array `[{ id, orden }]` actualiza el orden de todos los nodos del batch.

---

## Infraestructura de tests Frontend (T-39)

- [ ] `apps/web/vitest.config.ts` existe con `environment: 'jsdom'` y `globals: true`.
- [ ] `apps/web/src/test/setup.ts` importa `@testing-library/jest-dom`.
- [ ] `@testing-library/react`, `@testing-library/jest-dom` y `@testing-library/user-event` están en `devDependencies` de `apps/web/package.json`.
- [ ] `pnpm test --filter=web` ejecuta y reporta resultados (no falla con "no config found").

---

## Frontend — Lista de plantillas (`/inspecciones`)

- [ ] La tabla carga con datos reales del API (no mock).
- [ ] El filtro Activas/Inactivas/Todas funciona sin recargar la página.
- [ ] El botón Activar/Desactivar cambia el estado y refleja el cambio en la fila sin recargar toda la tabla.
- [ ] El botón Clonar solicita el nuevo nombre y crea la copia; la nueva plantilla aparece en la lista.
- [ ] El botón Eliminar pide confirmación antes de proceder.
- [ ] Se muestra estado de carga (spinner) mientras el API responde.
- [ ] Se muestra mensaje de error con botón "Reintentar" si el API falla.

---

## Frontend — Formulario de cabecera (`/inspecciones/nueva` y `/inspecciones/[id]/editar`)

- [ ] El formulario valida campos obligatorios antes de enviar (nombre, tipo, puntaje máximo).
- [ ] Al guardar una plantilla nueva, redirige al editor de estructura (`/inspecciones/[id]`).
- [ ] Al guardar edición, muestra confirmación y permanece en la misma pantalla.
- [ ] El campo "Puntaje máximo" acepta solo números positivos.
- [ ] El selector de tipo muestra las 6 opciones en español.
- [ ] El botón "Cancelar" regresa sin guardar cambios.

---

## Frontend — Editor de estructura (`/inspecciones/[id]`)

**Strip de resumen (mejora 1):**
- [ ] El strip muestra tipo de inspección, puntaje máximo, fecha de vigencia y badge de estado (Activa/Inactiva).
- [ ] El badge cambia de color: `bg-green-light/[0.08] text-green` si activa, `bg-red-light/[0.08] text-red` si inactiva.
- [ ] El botón "Editar cabecera" navega a `/inspecciones/[id]/editar`.
- [ ] El botón "Editar estructura" alterna entre modo vista y modo edición; su label cambia según el modo activo.
- [ ] El strip permanece visible al hacer scroll (posición fija o sticky).

**Estado vacío (mejora 3):**
- [ ] Si la plantilla no tiene nodos, la tabla muestra un estado vacío centrado — NO una tabla con filas vacías.
- [ ] El estado vacío incluye un ícono, texto "Esta ficha no tiene secciones todavía" y el botón primario "Agregar primera sección".
- [ ] Al hacer clic en "Agregar primera sección" se abre el panel lateral para crear un PANEL nivel 0.

**Estado de carga del editor:**
- [ ] Mientras `obtenerCompleta()` responde, el strip y la tabla muestran barras skeleton (`animate-pulse bg-gray-2 dark:bg-dark-3`), no texto ni botones.
- [ ] Si la carga falla (error de red o 404), se muestra una tarjeta de error con mensaje y botón "Reintentar".

**Tabla jerárquica:**
- [ ] Carga el árbol completo de nodos al entrar a la página.
- [ ] Las filas de sección nivel 0 tienen fondo `bg-primary text-white` (verde DoonFlow).
- [ ] Las filas de subsección nivel 1 tienen fondo `bg-gray-1 dark:bg-dark-2`.
- [ ] Las filas de pregunta tienen `hover:bg-gray-1 dark:hover:bg-dark-2`.
- [ ] El puntaje de cada PREGUNTA se muestra en color `text-primary`.
- [ ] En modo edición, las acciones (✏️ ➕ ⬆⬇ 🗑️) son visibles sobre cada fila.
- [ ] En modo vista, no aparece ningún control de edición.

**Panel lateral de edición (mejora 2 — guardado explícito):**
- [ ] El panel se abre al hacer clic en ✏️ de cualquier nodo, deslizándose desde la derecha.
- [ ] El panel muestra un overlay semitransparente detrás; hacer clic en el overlay cierra sin guardar.
- [ ] El formulario del panel muestra/oculta los campos de PREGUNTA según `tipo` del nodo.
- [ ] Los campos de opciones de respuesta aparecen solo para `SELECCION_UNICA` o `SELECCION_MULTIPLE`.
- [ ] Los inputs `evidenciaMinima`/`evidenciaMaxima` aparecen solo si `evidenciaObligatoria = true`.
- [ ] El botón "Guardar" envía los cambios al API y actualiza la fila en la tabla sin recargar la página.
- [ ] El botón "Cancelar" cierra el panel descartando todos los cambios — el estado anterior permanece intacto.
- [ ] Mientras se guarda, el botón "Guardar" muestra spinner y queda deshabilitado.
- [ ] Si el API retorna error, se muestra debajo del formulario con estilo `bg-red-light/[0.08] text-red`.

**Operaciones de estructura:**
- [ ] "Agregar sección" crea un PANEL en raíz (nivel 0); abre el panel lateral para editarlo.
- [ ] "Agregar hijo" en un PANEL crea un nodo PREGUNTA por defecto como hijo directo.
- [ ] Eliminar un nodo con hijos muestra advertencia: "Se eliminarán también sus N subítems. ¿Continuar?".
- [ ] Los botones ⬆/⬇ reordenan el nodo entre sus hermanos del mismo nivel.

**Rangos de resultado:**
- [ ] El token `naranja` existe en `packages/config/tailwind/preset.ts` antes de implementar `TablaRangos` (verificar con `pnpm build --filter=@doonflow/config`).
- [ ] La sección de rangos está visible debajo de la tabla, siempre (modo vista y modo edición).
- [ ] Cada fila es editable inline: Desde, Hasta, Clasificación, color.
- [ ] Si dos rangos se solapan, ambas filas muestran `border border-red` y aparece mensaje de error.
- [ ] Agregar y eliminar rangos funciona sin recargar la página.

**Responsive:**
- [ ] Las preguntas con `tipoRespuesta = SI_NO` muestran `Sí` en `text-green` y `No` en `text-red` en la columna CRITERIO (no una celda vacía).
- [ ] La página funciona correctamente en tablet (≥768px): strip arriba, tabla debajo, panel lateral en overlay.
- [ ] La página funciona correctamente en desktop (≥1280px): misma estructura pero con mayor espacio horizontal.

---

## Indicador de puntaje acumulado (mejora 7)

- [ ] El strip muestra `✓ X / Y pts` en verde cuando la suma de puntajes de las preguntas es igual al puntaje máximo de la plantilla.
- [ ] El strip muestra `⚠️ X / Y pts` en amarillo cuando la suma difiere del máximo.
- [ ] El indicador amarillo tiene un `title` (tooltip) con el texto: "Las preguntas suman X pts. El máximo declarado es Y. Ajusta los puntajes o el máximo de la ficha."
- [ ] Si no hay preguntas aún, el indicador muestra `— / Y pts` en color secundario.
- [ ] El indicador se actualiza en tiempo real al guardar un nodo (sin recargar la página).
- [ ] `sumarPuntajes([])` devuelve `0`.
- [ ] `sumarPuntajes` suma solo nodos PREGUNTA (ignora PANEL).
- [ ] `sumarPuntajes` en un árbol con PREGUNTAs anidadas en varios niveles devuelve la suma correcta.

---

## Breadcrumb (mejora 4)

- [ ] El breadcrumb aparece sobre el strip de resumen en `/inspecciones/[id]` y `/inspecciones/[id]/editar`.
- [ ] "Inspecciones" en el breadcrumb navega a `/inspecciones`.
- [ ] El nombre de la plantilla en el breadcrumb navega a `/inspecciones/[id]`.
- [ ] El último segmento ("Estructura" o "Editar cabecera") no es un enlace.
- [ ] El componente `Breadcrumb` de `packages/ui` funciona en cualquier módulo con props genéricas (array de `{ label, href? }`).

---

## Guardia de navegación (mejora 5)

- [ ] Si el panel lateral tiene cambios no guardados y el usuario hace clic en "← Volver", aparece el diálogo de confirmación.
- [ ] Si el panel lateral tiene cambios no guardados y el usuario hace clic en el breadcrumb, aparece el diálogo de confirmación.
- [ ] El botón "Quedarse" cierra el diálogo y mantiene el panel abierto con los cambios intactos.
- [ ] El botón "Salir sin guardar" descarta los cambios y navega a la ruta destino.
- [ ] Si el panel lateral está cerrado (o no tiene cambios), la navegación ocurre sin diálogo.
- [ ] El diálogo usa estilos consistentes con la plantilla: fondo overlay `bg-dark/40`, tarjeta `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark`.

---

## Colapso de secciones (mejora 6)

- [ ] Al cargar `/inspecciones/[id]`, todas las secciones de nivel 0 arrancan colapsadas (solo se ve la fila verde).
- [ ] Hacer clic en la fila de sección nivel 0 expande sus hijos.
- [ ] El icono cambia de `▶` a `▼` al expandir.
- [ ] Volver a hacer clic colapsa la sección; sus hijos desaparecen de la tabla.
- [ ] El estado de colapso no se guarda en BD — al recargar la página, todas las secciones vuelven a estar colapsadas.
- [ ] Las secciones de nivel 1+ no tienen control de colapso (siempre visibles si su padre está expandido).

---

## Reglas de negocio verificadas

- [ ] No se puede activar una plantilla sin al menos un nodo PREGUNTA (backend devuelve error descriptivo).
- [ ] No se puede ejecutar una plantilla inactiva (validado por `puedeIniciarInspeccion()` — verificar que el botón "Ejecutar" no aparece o está deshabilitado).
- [ ] No se puede eliminar una plantilla que tiene inspecciones ejecutadas asociadas (backend retorna error 409 con mensaje claro).
- [ ] El `empresaId` de la sesión es siempre el que se usa; no hay campo de empresa en los formularios.

---

## Tests de unidad — Backend (`agente-qa`)

> Vitest puro para dominio. Mock del repositorio para casos de uso. Sin Express, sin Prisma.

**`plantilla.entity.test.ts` — funciones de dominio puras:**
- [ ] `validarRangos([])` → `null`
- [ ] `validarRangos` con rangos válidos contiguos → `null`
- [ ] `validarRangos` con rangos solapados → string con descripción del conflicto
- [ ] `contarPreguntas([])` → `0`
- [ ] `contarPreguntas` con PANELes sin hijos → `0`
- [ ] `contarPreguntas` con árbol anidado de dos niveles y 3 PREGUNTAs → `3`
- [ ] `sumarPuntajes([])` → `0`
- [ ] `sumarPuntajes` suma solo nodos PREGUNTA, ignora PANEL → resultado correcto
- [ ] `sumarPuntajes` con PREGUNTAs en múltiples niveles de anidación → suma correcta
- [ ] `puedeIniciarInspeccion` con plantilla activa sin vigencia → `true`
- [ ] `puedeIniciarInspeccion` con plantilla inactiva → `false`
- [ ] `puedeIniciarInspeccion` con vigencia vencida → `false`
- [ ] `puedeIniciarInspeccion` con vigencia futura → `true`

**`gestionar-plantilla.usecase.test.ts` — caso de uso con mock del repositorio:**
- [ ] `crear()` llama `repo.crear()` con los datos exactos del input y retorna la plantilla
- [ ] `obtenerCompleta()` lanza `PlantillaNoEncontradaError` si el repo retorna `null`
- [ ] `actualizar()` lanza `PlantillaNoEncontradaError` si la plantilla no existe
- [ ] `activar()` llama `repo.cambiarEstado(id, empresaId, true, usuarioId)`
- [ ] `desactivar()` llama `repo.cambiarEstado(id, empresaId, false, usuarioId)`
- [ ] `eliminar()` lanza `PlantillaNoEncontradaError` si no existe
- [ ] `clonar()` lanza `PlantillaNoEncontradaError` si no existe
- [ ] `crearNodo()` sin `padreId` → llama `repo.crearNodo()` con `nivel = 0`
- [ ] `crearNodo()` con `padreId` válido → `nivel = padre.nivel + 1`
- [ ] `validarRangos()` (caso de uso) lanza `RangosInvalidosError` si los rangos se solapan

**Test de integración (contra BD de pruebas local):**
- [ ] `POST /inspeccion/plantillas` → `GET /inspeccion/plantillas/:id` retorna plantilla con `nodos: []` y `rangosResultado: []`

---

## Tests de unidad — Frontend (`agente-qa`)

> Vitest + React Testing Library. Sin llamadas reales de red (servicios mockeados).

**`strip-resumen-plantilla.test.tsx`:**
- [ ] Renderiza tipo de inspección, puntaje máximo y badge Activa/Inactiva
- [ ] Indicador verde `✓ X/Y pts` cuando `puntajeAcumulado === puntajeMaximo`
- [ ] Indicador amarillo `⚠️ X/Y pts` cuando difieren
- [ ] Indicador `—` cuando `puntajeAcumulado === 0` (sin preguntas)
- [ ] El toggle de modo cambia su label al hacer clic

**`tabla-ficha.test.tsx`:**
- [ ] Con `nodos = []` muestra estado vacío con texto y botón "Agregar primera sección"
- [ ] Con `nodos` no vacíos no muestra el estado vacío
- [ ] `modoEdicion = false` → no renderiza controles de edición en las filas
- [ ] `modoEdicion = true` → renderiza controles de edición en las filas

**`fila-seccion.test.tsx`:**
- [ ] Nivel 0 → clase `bg-primary` presente; nivel 1 → `bg-primary` ausente
- [ ] Nivel 0 → renderiza ícono de colapso; nivel 1 → no lo renderiza
- [ ] Clic en ícono de colapso llama `onToggleColapso(id)`
- [ ] `modoEdicion = false` → acciones ocultas; `true` → acciones visibles

**`panel-edicion-nodo.test.tsx`:**
- [ ] `tipo = PANEL` → campos de PREGUNTA no se renderizan
- [ ] `tipo = PREGUNTA` → campos de PREGUNTA se renderizan
- [ ] `tipoRespuesta` distinto de selección → bloque de opciones no se renderiza
- [ ] `tipoRespuesta = SELECCION_UNICA` → bloque de opciones se renderiza
- [ ] `evidenciaObligatoria = false` → inputs de min/max evidencia no se renderizan
- [ ] `evidenciaObligatoria = true` → inputs de min/max evidencia se renderizan
- [ ] Clic en "Guardar" llama `onGuardar` con los datos del formulario
- [ ] Clic en "Cancelar" llama `onCancelar` sin llamar `onGuardar`
- [ ] `guardando = true` → botón "Guardar" deshabilitado con spinner
- [ ] Si `error` tiene valor → se renderiza el mensaje de error

**`tabla-rangos.test.tsx`:**
- [ ] Rangos sin solapamiento → sin mensaje de error
- [ ] Rangos solapados → mensaje de error + filas conflictivas resaltadas
- [ ] Clic en "Agregar rango" llama `onAgregar`
- [ ] Clic en eliminar de una fila llama `onEliminar(id)`

**`usar-editor-plantilla.test.ts` (hook):**
- [ ] `hayCambiosPendientes = false` cuando panel cerrado
- [ ] `hayCambiosPendientes = false` cuando panel abierto pero sin cambios
- [ ] `hayCambiosPendientes = true` cuando panel abierto con cambios
- [ ] `puntajeAcumulado` se recalcula tras `guardarNodo()`
- [ ] `toggleColapso(id)` agrega/quita el id de `seccionesColapsadas`
- [ ] `cerrarPanel()` con `formPanelDirty = true` no navega directamente

**`breadcrumb.test.tsx` y `dialogo-confirmacion.test.tsx` (`packages/ui`):**
- [ ] Breadcrumb: segmentos con `href` renderizan enlace; último segmento solo texto
- [ ] Diálogo: `abierto = false` → no renderiza nada
- [ ] Diálogo: clic en botón primario llama `onConfirmar`; secundario llama `onCancelar`

---

## Autenticación en el servicio frontend

- [ ] `inspeccion.servicio.ts` incluye el header `Authorization: Bearer <token>` en todas las llamadas al API Route Handler.
- [ ] Las llamadas sin token válido redirigen al login — no muestran un error de red crudo al usuario.
- [ ] El token se obtiene con el mismo helper que usa el módulo `auth` existente (no se duplica la lógica de sesión).

---

## Accesibilidad

- [ ] El panel lateral tiene `role="dialog"` y `aria-labelledby` apuntando al título del panel.
- [ ] Al abrir el panel, el foco se mueve al primer campo del formulario (input Código).
- [ ] Al cerrar el panel, el foco regresa al botón ✏️ que lo abrió.
- [ ] Los botones de acción de fila (✏️ ➕ ⬆⬇ 🗑️) tienen `aria-label` descriptivo con el nombre del nodo.
- [ ] Los íconos de colapso `▶/▼` tienen `aria-expanded` y `aria-controls` apuntando al grupo de filas que controlan.
- [ ] El overlay `bg-dark/40` tiene `aria-hidden="true"`.

---

## Arquitectura hexagonal, Clean Code y documentación ISO

**Arquitectura hexagonal:**
- [ ] Ningún archivo en `domain/` o `application/` importa `express` ni `@prisma/client` (verificar con `pnpm lint` o búsqueda en el PR).
- [ ] `GestionarPlantillaUseCase` recibe el repositorio por constructor — no instancia Prisma directamente.
- [ ] Los controladores no contienen lógica de negocio — solo parsean request, llaman al caso de uso y formatean la respuesta.
- [ ] `sumarPuntajes()`, `validarRangos()` y `contarPreguntas()` están en `domain/plantilla.entity.ts`, no en el controlador ni en el repositorio.

**Clean Code:**
- [ ] Ninguna función supera ~30 líneas sin extraer auxiliares con nombre descriptivo.
- [ ] `pnpm lint` pasa en verde (sin warnings ni errores) en `apps/api` y `apps/web`.
- [ ] No hay variables sin usar ni código comentado como "// TODO: implementar".
- [ ] Los casos de test describen el comportamiento en lenguaje natural (`"lanza error cuando el repositorio retorna null"`), no el nombre del método.

**Documentación ISO (JSDoc):**
- [ ] Todas las funciones exportadas de `domain/plantilla.entity.ts` tienen JSDoc con `@param`, `@returns` y al menos un `@example`.
- [ ] Todos los métodos de `PlantillaRepositoryPort` tienen JSDoc de una línea mínimo.
- [ ] Las acciones expuestas por `usar-editor-plantilla.ts` (`abrirPanel`, `guardarNodo`, `toggleColapso`, etc.) tienen JSDoc con `@param` y descripción de efecto secundario si lo hay.
- [ ] Los componentes `Breadcrumb` y `DialogoConfirmacion` de `packages/ui` tienen JSDoc con descripción y props documentadas.

---

## Definición de "done" para el sprint

El sprint 001 se considera completo cuando:
1. Todos los ítems de este checklist están marcados ✅.
2. `agente-qa` aprobó el PR con:
   - Cobertura ≥ 80% en `domain/` y `application/` del módulo inspeccion.
   - Todos los tests de componentes y hook del frontend pasan en verde.
   - `pnpm lint` sin errores en `apps/api` y `apps/web`.
3. Arquitectura hexagonal verificada: ningún archivo de `domain/` o `application/` importa Express ni Prisma.
4. JSDoc presente en todas las funciones exportadas de `domain/plantilla.entity.ts` y en el puerto `PlantillaRepositoryPort`.
5. La historia de usuario se ejecuta de punta a punta en el entorno local: crear una ficha, agregar secciones y preguntas, configurar rangos, verificar el indicador de puntaje, clonar y desactivar — sin errores en consola ni en la red.
