# Tareas — 001-crud-formulario

> Orden de ejecución: Base de datos → API → Frontend → Tests. Cada capa depende de la anterior.

---

## Agente: `agente-basededatos`

- [ ] **T-01** Verificar que la migración `20260616222603_add_inspecciones` cubre todas las tablas necesarias:
  - `plantilla_inspeccion` (cabecera)
  - `nodo_inspeccion` (árbol genérico PANEL/PREGUNTA)
  - `nodo_opcion` (opciones de respuesta)
  - `rango_resultado` (rangos de calificación)
- [ ] **T-02** Confirmar índices en `nodo_inspeccion`: `(plantilla_id, orden)`, `(padre_id)`, `(empresa_id)`.
- [ ] **T-03** Revisar que las columnas opcionales de PREGUNTA (`tipo_respuesta`, `modalidad_puntaje`, `puntaje_maximo`, `regla_comentario`, `evidencia_obligatoria`, `evidencia_minima`, `evidencia_maxima`) permiten NULL para nodos PANEL.
- [ ] **T-04** Agregar entrada en `memoria/cambios_db/registro.md` con el resultado de la revisión.

---

## Agente: `agente-backend`

- [ ] **T-05** Agregar función `sumarPuntajes(nodos: NodoArbol[]): number` en `domain/plantilla.entity.ts` — recorre el árbol recursivamente sumando `puntajeMaximo` solo de nodos PREGUNTA. Re-exportar desde `packages/shared/src/utils/inspeccion.ts` junto a `contarPreguntas` y `validarRangos`.
- [ ] **T-06** Completar `plantilla.prisma-repository.ts`: implementar todos los métodos del puerto (`listar`, `obtenerCompleta`, `crear`, `actualizar`, `cambiarEstado`, `eliminar`, `clonar`, `crearNodo`, `actualizarNodo`, `eliminarNodo`, `reordenarNodos`).
- [ ] **T-07** Completar `plantilla.controller.ts` y `inspeccion.router.ts`: endpoints REST:
  - `GET    /inspeccion/plantillas` — lista paginada con filtros
  - `POST   /inspeccion/plantillas` — crear cabecera
  - `GET    /inspeccion/plantillas/:id` — obtener completa (árbol + rangos)
  - `PATCH  /inspeccion/plantillas/:id` — actualizar cabecera
  - `PATCH  /inspeccion/plantillas/:id/estado` — activar/desactivar
  - `DELETE /inspeccion/plantillas/:id` — eliminar
  - `POST   /inspeccion/plantillas/:id/clonar` — clonar
  - `POST   /inspeccion/plantillas/:id/nodos` — crear nodo
  - `PATCH  /inspeccion/plantillas/:id/nodos/:nodoId` — actualizar nodo
  - `DELETE /inspeccion/plantillas/:id/nodos/:nodoId` — eliminar nodo (cascada)
  - `PATCH  /inspeccion/plantillas/:id/nodos/reordenar` — actualizar orden en batch
- [ ] **T-08** Verificar que el router de inspecciones está montado en `apps/api/src/index.ts`.
- [ ] **T-09** Crear Route Handlers Next.js proxy en `apps/web/src/app/api/inspeccion/` para cada grupo de endpoints (ver `impl.md` → Archivos a crear).

---

## Agente: `agente-frontend`

- [ ] **T-10** Completar `inspeccion.servicio.ts`: funciones para cada endpoint de T-07. Cada función debe adjuntar el JWT en el header `Authorization: Bearer <token>` — leer el token con el mismo mecanismo que usa el módulo `auth` existente (cookie de sesión / `getServerSession` si es Server Action, o el helper de cliente si es Client Component).
- [ ] **T-11** Completar `usar-plantillas.ts`: estado de lista + acciones (toggle, clonar, eliminar).
- [ ] **T-12** Crear hook `usar-editor-plantilla.ts`: carga plantilla completa, gestiona nodo activo, panel lateral abierto/cerrado, `formPanelDirty`, `seccionesColapsadas`, y derivados `hayCambiosPendientes`, `puntajeAcumulado`, `totalPreguntas` (usando `sumarPuntajes` y `contarPreguntas` de `packages/shared`).
- [ ] **T-13** Crear componente `Breadcrumb` en `packages/ui` — ruta clickeable genérica `[{ label, href? }]`, reutilizable en todos los módulos.
- [ ] **T-14** Crear componente `DialogoConfirmacion` en `packages/ui` — modal genérico con título, mensaje, botón primario y botón secundario. Sin lógica de dominio.
- [ ] **T-15** Crear componente `StripResumenPlantilla` — strip fijo con tipo, puntaje máx, vigencia, badge estado, indicador `puntajeAcumulado / puntajeMaximo` (verde `✓` / amarillo `⚠️`), toggle de modo.
- [ ] **T-16** Crear componente `TablaFicha` — tabla jerárquica; gestiona colapso de secciones nivel 0 y estado vacío con CTA "Agregar primera sección".
- [ ] **T-17** Crear componente `FilaSeccion` — fila PANEL con estilos por nivel (0 = `bg-primary`, 1+ = `bg-gray-1`) y toggle colapso en nivel 0.
- [ ] **T-18** Crear componente `FilaPregunta` — fila PREGUNTA con celdas ASPECTO (rowspan) / REQUERIMIENTOS / CRITERIO / PUNTOS.
- [ ] **T-19** Crear componente `PanelEdicionNodo` — panel lateral deslizable con formulario dinámico PANEL/PREGUNTA, `ListaOpciones` y botones Guardar / Cancelar.
- [ ] **T-40** Agregar token `naranja` al preset Tailwind en `packages/config/tailwind/preset.ts`: `naranja: { DEFAULT: '#FD7E14', light: '#FFF1E6' }`. Verificar con `pnpm build --filter=@doonflow/config` que el preset compila sin errores. Esto desbloquea el dot de color naranja en `TablaRangos` sin usar `#hex` directo.

- [ ] **T-20** Crear componente `TablaRangos` — rangos editables inline con validación de solapamiento en tiempo real.
- [ ] **T-21** Implementar guardia de navegación en `usar-editor-plantilla.ts`: mostrar `DialogoConfirmacion` al intentar navegar con `hayCambiosPendientes = true`.
- [ ] **T-22** Implementar `apps/web/.../inspecciones/[id]/page.tsx` — editor de estructura completo (ver `impl.md` → Layout).
- [ ] **T-23** Completar `apps/web/.../inspecciones/[id]/editar/page.tsx` — edición de cabecera.
- [ ] **T-24** Verificar que la página de lista (`/inspecciones`) conecta con el servicio real (no mock).

---

## Agente: `agente-qa` — Tests de unidad Backend

> Herramienta: **Vitest**. Los tests de dominio son puros (sin mocks). Los de caso de uso usan mock del repositorio.

- [ ] **T-25** `plantilla.entity.test.ts` — función `validarRangos()`:
  - Sin rangos `[]` → `null`
  - Un solo rango → `null`
  - Rangos válidos contiguos (0–50, 51–100) → `null`
  - Rangos solapados (0–50, 40–100) → string con mensaje de error
  - Rangos desordenados que se solapan → detecta el solapamiento correctamente

- [ ] **T-26** `plantilla.entity.test.ts` — función `contarPreguntas()`:
  - Árbol vacío `[]` → `0`
  - Un solo PANEL sin hijos → `0`
  - Un PANEL con tres PREGUNTA hijos → `3`
  - Árbol anidado (PANEL → PANEL → PREGUNTA × 2) → `2`

- [ ] **T-27** `plantilla.entity.test.ts` — función `sumarPuntajes()`:
  - Árbol vacío `[]` → `0`
  - Un PANEL sin hijos → `0`
  - Tres PREGUNTAs con puntajes 10, 30, 60 → `100`
  - Árbol con PREGUNTAs en distintos niveles de anidación → suma correcta (no cuenta PANELes)

- [ ] **T-28** `plantilla.entity.test.ts` — función `puedeIniciarInspeccion()`:
  - Plantilla activa sin fecha de vigencia → `true`
  - Plantilla inactiva → `false`
  - Plantilla activa con vigencia futura → `true`
  - Plantilla activa con vigencia vencida → `false`

- [ ] **T-29** `gestionar-plantilla.usecase.test.ts` — `GestionarPlantillaUseCase`:
  - `crear()` llama `repo.crear()` con los datos correctos y retorna la plantilla
  - `obtenerCompleta()` lanza `PlantillaNoEncontradaError` si el repo retorna `null`
  - `actualizar()` lanza `PlantillaNoEncontradaError` si la plantilla no existe
  - `activar()` llama `repo.cambiarEstado()` con `activa = true`
  - `desactivar()` llama `repo.cambiarEstado()` con `activa = false`
  - `eliminar()` lanza `PlantillaNoEncontradaError` si no existe
  - `clonar()` lanza `PlantillaNoEncontradaError` si no existe
  - `crearNodo()` calcula `nivel = 0` cuando no hay `padreId`
  - `crearNodo()` calcula `nivel = padre.nivel + 1` cuando se provee `padreId` válido
  - `validarRangos()` lanza `RangosInvalidosError` si los rangos se solapan

- [ ] **T-30** Test de integración ligera: `POST /inspeccion/plantillas` → `GET /inspeccion/plantillas/:id` retorna la plantilla con `nodos: []` y `rangosResultado: []` (contra BD de pruebas local).

---

## Agente: `agente-qa` — Tests de unidad Frontend

> Herramienta: **Vitest + React Testing Library**. Los servicios y el API se mockean. No se hacen llamadas reales de red.

- [ ] **T-39** Configurar infraestructura de tests en `apps/web`:
  - Instalar `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` como devDependencies.
  - Crear `apps/web/vitest.config.ts` con `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/test/setup.ts']`.
  - Crear `apps/web/src/test/setup.ts` con `import '@testing-library/jest-dom'`.
  - Verificar que `pnpm test --filter=web` ejecuta los tests del directorio `__tests__/` y reporta resultados.

- [ ] **T-31** `strip-resumen-plantilla.test.tsx`:
  - Renderiza tipo, puntaje máximo y badge "Activa" / "Inactiva" con los props correspondientes
  - Indicador verde con prefijo `✓` cuando `puntajeAcumulado === puntajeMaximo`
  - Indicador amarillo con prefijo `⚠️` cuando difieren
  - Indicador `—` cuando `puntajeAcumulado === 0` y no hay preguntas
  - El botón "Editar cabecera" llama al handler `onEditarCabecera`
  - El toggle de modo cambia el label entre "Editar estructura" y "Ver estructura"

- [ ] **T-32** `tabla-ficha.test.tsx`:
  - Con `nodos = []` renderiza el estado vacío con texto "Esta ficha no tiene secciones todavía"
  - Con `nodos = []` renderiza el botón "Agregar primera sección"
  - Con nodos renderiza las filas correctas (no el estado vacío)
  - En `modoEdicion = false` no renderiza ningún control de acciones
  - En `modoEdicion = true` renderiza los botones ✏️ y 🗑️ en las filas

- [ ] **T-33** `fila-seccion.test.tsx`:
  - Nivel 0 aplica clase `bg-primary` al elemento de fila
  - Nivel 1 aplica clase `bg-gray-1` (no `bg-primary`)
  - Nivel 0 renderiza el icono de colapso `▶`; al hacer clic, llama `onToggleColapso`
  - Nivel 1+ no renderiza icono de colapso
  - `modoEdicion = true` muestra las acciones; `false` no las muestra

- [ ] **T-34** `panel-edicion-nodo.test.tsx`:
  - Con `nodo.tipo = "PANEL"` no renderiza los campos de PREGUNTA (tipo respuesta, modalidad, etc.)
  - Con `nodo.tipo = "PREGUNTA"` renderiza los campos de PREGUNTA
  - Los campos de opciones de respuesta aparecen solo con `tipoRespuesta = SELECCION_UNICA` o `SELECCION_MULTIPLE`
  - Los inputs `evidenciaMinima`/`evidenciaMaxima` no se renderizan cuando `evidenciaObligatoria = false`
  - Los inputs `evidenciaMinima`/`evidenciaMaxima` se renderizan cuando `evidenciaObligatoria = true`
  - El botón "Guardar" llama `onGuardar` con los datos del formulario
  - El botón "Cancelar" llama `onCancelar` sin llamar `onGuardar`
  - Mientras `guardando = true`, el botón "Guardar" está deshabilitado y muestra spinner
  - Si se provee `error`, se renderiza el mensaje de error

- [ ] **T-35** `tabla-rangos.test.tsx`:
  - Con rangos sin solapamiento no muestra ningún mensaje de error
  - Con dos rangos solapados muestra el mensaje de error y resalta las filas conflictivas
  - El botón "Agregar rango" llama al handler `onAgregar`
  - El botón de eliminar de una fila llama al handler `onEliminar(id)`
  - Editar `desde` o `hasta` dispara revalidación en tiempo real

- [ ] **T-36** `usar-editor-plantilla.test.ts` (hook):
  - `hayCambiosPendientes` es `false` cuando `panelAbierto = false`
  - `hayCambiosPendientes` es `false` cuando `panelAbierto = true` y `formPanelDirty = false`
  - `hayCambiosPendientes` es `true` cuando `panelAbierto = true` y `formPanelDirty = true`
  - `puntajeAcumulado` se recalcula tras `guardarNodo()`
  - `toggleColapso(id)` agrega el id a `seccionesColapsadas` si no estaba; lo quita si estaba
  - `cerrarPanel()` con `formPanelDirty = true` expone la señal para mostrar el diálogo (no navega directamente)

- [ ] **T-37** `breadcrumb.test.tsx` (`packages/ui`):
  - Renderiza todos los segmentos del array de props
  - Los segmentos con `href` renderizan un `<a>` o `<Link>`
  - El último segmento (sin `href`) renderiza solo texto, no un enlace

- [ ] **T-38** `dialogo-confirmacion.test.tsx` (`packages/ui`):
  - Renderiza título y mensaje recibidos por props
  - El botón primario llama `onConfirmar`
  - El botón secundario llama `onCancelar`
  - No renderiza nada cuando `abierto = false`

---

## Dependencias entre tareas

```
T-01, T-02, T-03 → T-04
T-04 → T-05 → T-06 → T-07 → T-08 → T-09
T-09 → T-10 → T-11 → T-12
T-09 → T-13, T-14              ← componentes UI puros, no dependen del hook
T-12 → T-15, T-16, T-17, T-18, T-19, T-21, T-22, T-23, T-24
T-40 → T-20                    ← TablaRangos necesita el token naranja
T-12 → T-20
T-05 → T-25, T-26, T-27, T-28
T-06 → T-29
T-07 → T-30
T-39 → T-31, T-32, T-33, T-34, T-35, T-36, T-37, T-38
T-13 → T-37
T-14 → T-38
T-15 → T-31
T-16 → T-32
T-17 → T-33
T-19 → T-34
T-20 → T-35
T-12 → T-36
```
