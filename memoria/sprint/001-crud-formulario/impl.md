# Guía de implementación — 001-crud-formulario

> Referencia técnica para los agentes. Describe qué construir y dónde, sin escribir el código — el código va en el repositorio, no aquí.

---

## Archivos a crear / completar

### Backend (`apps/api`)

```
src/modules/inspeccion/
├── infrastructure/
│   ├── plantilla.prisma-repository.ts   ← COMPLETAR (existe, vacío o parcial)
│   ├── plantilla.controller.ts          ← COMPLETAR
│   └── inspeccion.router.ts             ← COMPLETAR (montar todos los endpoints de T-06)
```

### Route Handlers proxy (Next.js)

```
apps/web/src/app/api/inspeccion/
├── plantillas/
│   ├── route.ts                         ← GET (lista) + POST (crear)
│   └── [id]/
│       ├── route.ts                     ← GET (completa) + PATCH (cabecera) + DELETE
│       ├── estado/route.ts              ← PATCH (activar/desactivar)
│       ├── clonar/route.ts              ← POST
│       ├── nodos/
│       │   ├── route.ts                 ← POST (crear nodo)
│       │   ├── reordenar/route.ts       ← PATCH (reordenar)
│       │   └── [nodoId]/route.ts        ← PATCH (actualizar) + DELETE
```

### Frontend (`apps/web`)

```
src/app/(dashboard)/inspecciones/
├── page.tsx                             ← EXISTE (revisar conexión real)
├── nueva/page.tsx                       ← EXISTE (revisar)
├── [id]/
│   ├── page.tsx                         ← IMPLEMENTAR (editor de estructura)
│   └── editar/page.tsx                  ← IMPLEMENTAR (edición de cabecera)
├── _servicios/
│   └── inspeccion.servicio.ts           ← COMPLETAR (existe, revisar métodos)
├── _hooks/
│   ├── usar-plantillas.ts               ← EXISTE (revisar)
│   └── usar-editor-plantilla.ts         ← CREAR
├── _components/
│   ├── tabla-plantillas.tsx             ← EXISTE
│   ├── badge-tipo.tsx                   ← EXISTE
│   ├── indicador-pregunta.tsx           ← EXISTE
│   ├── strip-resumen-plantilla.tsx      ← CREAR
│   ├── tabla-ficha.tsx                  ← CREAR
│   ├── fila-seccion.tsx                 ← CREAR
│   ├── fila-pregunta.tsx                ← CREAR
│   ├── panel-edicion-nodo.tsx           ← CREAR
│   ├── lista-opciones.tsx               ← CREAR (sub de panel-edicion-nodo)
│   └── tabla-rangos.tsx                 ← CREAR
└── __tests__/                           ← CREAR (Vitest + React Testing Library)
    ├── strip-resumen-plantilla.test.tsx
    ├── tabla-ficha.test.tsx
    ├── fila-seccion.test.tsx
    ├── panel-edicion-nodo.test.tsx
    ├── tabla-rangos.test.tsx
    └── usar-editor-plantilla.test.ts

packages/ui/src/
├── breadcrumb.tsx                       ← CREAR
└── dialogo-confirmacion.tsx             ← CREAR

packages/ui/src/__tests__/
├── breadcrumb.test.tsx                  ← CREAR
└── dialogo-confirmacion.test.tsx        ← CREAR
```

### Backend — Tests (`apps/api`)

```
src/modules/inspeccion/
├── domain/
│   └── plantilla.entity.ts              ← agregar sumarPuntajes()
└── __tests__/
    ├── plantilla.entity.test.ts         ← CREAR (Vitest puro, sin mocks)
    └── gestionar-plantilla.usecase.test.ts ← CREAR (Vitest + mock del repositorio)
```

---

## Diseño de UI — Editor de Ficha de Inspección

### Principio de diseño

El editor reproduce visualmente la **forma final del formulario**. El administrador ve exactamente cómo lucirá la ficha durante la ejecución. Las acciones de edición (agregar, editar, eliminar, reordenar) aparecen como controles superpuestos sobre esa misma tabla, no en un panel separado.

Hay dos modos en la misma página:
- **Modo vista**: tabla limpia, sin controles de edición visibles.
- **Modo edición** (botón "Editar estructura"): acciones visibles en cada fila (hover o siempre visibles en tablet).

---

### Layout general (`/inspecciones/[id]`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Volver    Inspección Ministerio de Salud 2026                    │
├─────────────────────────────────────────────────────────────────────┤  ← MEJORA 1: Strip fijo
│  Min. Salud · Puntaje máx: 100 · Vigencia: 31/12/2026              │
│  [● Activa]  [✓ 100/100 pts]          [Editar cabecera]  [✎ Modo] │
│               ↑ verde si coincide                                   │
│               ↑ [⚠️ 85/100 pts] amarillo si difieren + tooltip      │  ← MEJORA 7
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌── TABLA FICHA DE INSPECCIÓN ───────────────────────────────────┐ │
│  │  ASPECTO    │  REQUERIMIENTOS          │  CRITERIO  │  PUNTAJE │ │
│  ├─────────────┴──────────────────────────┴────────────┴──────────┤ │
│  │  ████  1. EDIFICIO  ████████████████████████  ✏️ ➕ ⬆⬇ 🗑️  ██ │ │  ← PANEL nivel 0 (bg-primary)
│  ├──────────────────────────────────────────────────────────────  │ │
│  │    1.1  PLANTA Y SUS ALREDEDORES               ✏️ ➕ ⬆⬇ 🗑️   │ │  ← PANEL nivel 1 (bg-gray-1)
│  ├──────────────────────────────────────────────────────────────  │ │
│  │      1.1.1  ALREDEDORES                        ✏️ ➕ ⬆⬇ 🗑️   │ │  ← PANEL nivel 2 (bg-white)
│  ├─────────────┬────────────────────────────────────────────────  │ │
│  │  a) Limpios │  i)  Almacenamiento del equipo en desuso         │ │  ← PREGUNTA
│  │             │  ii) Libres de basuras y desperdicios            │ │
│  │             │  iii) Áreas verdes limpias        Cumple i,ii,iii│ 1│
│  ├─────────────┴────────────────────────────────────── ✏️ ⬆⬇ 🗑️  │ │
│  │                                                                │ │
│  │         ┌────────────────────────────────────────────────┐    │ │  ← MEJORA 3: Estado vacío
│  │         │   📋  Esta ficha no tiene secciones todavía.   │    │ │     (solo cuando nodos = [])
│  │         │   [+ Agregar primera sección]                  │    │ │
│  │         └────────────────────────────────────────────────┘    │ │
│  │  [+ Agregar sección]  ← (modo edición, al pie de la tabla)    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌── RANGOS DE RESULTADO ─────────────────────────────────────────┐ │
│  │  0 – 60    Deficiente   ● rojo                                 │ │
│  │  61 – 80   Aceptable    ● amarillo                             │ │
│  │  81 – 100  Excelente    ● verde                                │ │
│  │  [+ Agregar rango]                                             │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

  Panel lateral (MEJORA 2 — guardado explícito):          ← se desliza desde la derecha al hacer ✏️
  ┌──────────────────────────────┐
  │  Editar pregunta        [×]  │
  │  ──────────────────────────  │
  │  Código     [1.1.1-a       ] │
  │  Título     [Limpios       ] │
  │  Criterio   [_____________ ] │
  │  ──────────────────────────  │
  │  Tipo resp. [Sel. única   ▼] │
  │  Modalidad  [Fijo         ▼] │
  │  Puntaje máx[100           ] │
  │  Regla com. [Cuando neg.  ▼] │
  │  Evidencia  [  No  ●       ] │
  │  ──────────────────────────  │
  │  Opciones                    │
  │  Cumple i,ii,iii    │  1     │
  │  Cumple dos         │  0.5   │
  │  No cumple          │  0     │
  │  [+ Agregar opción]          │
  │  ──────────────────────────  │
  │  [error si lo hay]           │
  │  [Guardar]   [Cancelar]      │  ← guardado explícito
  └──────────────────────────────┘
```

---

### Estado de carga del editor (`/inspecciones/[id]`)

Mientras `cargando = true` (antes de recibir la respuesta de `obtenerCompleta()`), mostrar un skeleton en lugar del contenido real. No mostrar texto, títulos ni botones funcionales durante la carga.

- **Strip**: tres barras `h-4 w-32 rounded bg-gray-2 dark:bg-dark-3 animate-pulse` en lugar de los textos de tipo, puntaje y vigencia.
- **Tabla**: 4–6 filas de `h-10 bg-gray-2 dark:bg-dark-3 animate-pulse border-b border-stroke dark:border-dark-3`.
- **Rangos**: 3 filas skeleton con la misma clase.
- Si `cargando = false` y `plantilla = null` (error de red o 404), mostrar tarjeta de error: `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark p-6` con el mensaje de error y un botón "Reintentar" (`variant="secundario"`).

---

### Paleta de colores — tokens DoonFlow (mismos que login)

Usar **exclusivamente** los tokens del preset DoonFlow (`packages/config/tailwind/preset.ts`). No usar colores hardcodeados (`#hex`).

| Token | Valor | Uso en la ficha |
|---|---|---|
| `bg-primary` | `#2F9E44` (verde agro) | Cabecera de sección nivel 0, botón primario, panel de marca |
| `bg-dark dark:bg-dark-2` | `#111928 / #1F2A37` | Fondo alternativo oscuro de secciones |
| `bg-white dark:bg-gray-dark` | `#FFF / #122031` | Contenedor de la tabla (igual que login) |
| `bg-gray-1 dark:bg-dark-2` | `#F9FAFB / #1F2A37` | Fila de subsección nivel 1 (como `TableHeader` de la plantilla) |
| `border-stroke dark:border-dark-3` | `#E6EBF1 / #374151` | Bordes de filas y celdas |
| `text-dark dark:text-white` | `#111928 / #FFF` | Texto principal |
| `text-dark-4 dark:text-dark-6` | `#4B5563 / #9CA3AF` | Texto secundario / criterios |
| `shadow-1 dark:shadow-card` | — | Sombra del contenedor (igual que login) |
| `bg-red-light/[0.08] text-red` | — | Error / validación (igual que login) |
| `text-primary` | `#2F9E44` | Botón outline, puntajes destacados |

---

### Tipos de fila y sus estilos

#### Fila de sección principal — PANEL nivel 0

```
bg-primary text-white            ← verde DoonFlow, igual que el panel de marca del login
font-bold text-sm uppercase tracking-wide
px-4 py-3
colspan="4"   ← ocupa toda la fila
```
Acción en modo edición (derecha, sobre fondo primary): ✏️ · ➕ subsección · 🗑️ · ⬆⬇  
Iconos con `text-white/70 hover:text-white`

#### Fila de subsección — PANEL nivel 1

```
bg-gray-1 dark:bg-dark-2         ← mismo fondo que TableHeader de la plantilla
font-semibold text-dark dark:text-white text-sm
border-b border-stroke dark:border-dark-3
px-4 py-2.5
colspan="4"
```

#### Fila de sub-subsección — PANEL nivel 2+

```
bg-white dark:bg-gray-dark       ← mismo fondo que el contenedor del login
font-medium text-dark-4 dark:text-dark-6 text-sm
border-b border-stroke dark:border-dark-3
px-4 py-2  pl-8                  ← indentación por nivel
colspan="4"
```

#### Fila de pregunta — PREGUNTA

```
border-b border-stroke dark:border-dark-3
hover:bg-gray-1 dark:hover:bg-dark-2
```

Celdas:
- **ASPECTO** (`w-[130px] align-top px-4 py-3 text-sm font-medium text-dark dark:text-white`): código + título. `rowspan` agrupa ítems del mismo aspecto. Solo visible en la primera fila del grupo.
- **REQUERIMIENTOS** (`px-4 py-3 text-sm text-dark-4 dark:text-dark-5`): sub-ítems como `<ul>` con `list-none space-y-1`.
- **CRITERIO** (`w-[220px] px-4 py-3 text-body-sm text-dark-4 dark:text-dark-6`): texto de cumplimiento (opciones del dominio). Para `tipoRespuesta = SI_NO`: mostrar dos badges inline — `Sí` en `text-green` y `No` en `text-red` — si el nodo no tiene criterio textual definido. Si tiene criterio textual, mostrarlo como texto plano.
- **PUNTOS** (`w-[80px] text-center px-4 py-3 font-bold text-primary dark:text-primary`): puntaje en color `primary` verde.

Acción en modo edición (hover sobre la fila): `text-dark-4 hover:text-primary` para ✏️ y 🗑️.

---

### Panel de edición inline (modal deslizable)

Al hacer clic en ✏️ de cualquier nodo, se abre un **panel lateral deslizable desde la derecha** (no una página nueva, no un modal centrado):

```
┌──────────────────────────────┐
│  Editar aspecto              │  ← título dinámico según tipo
│  ─────────────────────────── │
│  Código       [1.1.1       ] │
│  Título       [ALREDEDORES ] │
│  Criterio     [____________] │
│  ─────────────────────────── │
│  (si es PREGUNTA)            │
│  Tipo respuesta [Sel. única▼]│
│  Modalidad      [Fijo      ▼]│
│  Puntaje máx.   [100       ] │
│  Regla comentario[Cuando neg]│
│  Evidencia oblig. [  No  ●  ]│
│  ─────────────────────────── │
│  Opciones de respuesta       │
│  ┌──────────────┬────────┐   │
│  │ Etiqueta     │ Puntos │   │
│  │ Cumple i,ii,iii │  1  │   │
│  │ Cumple dos  │  0.5    │   │
│  │ No cumple   │    0    │   │
│  └──────────────┴────────┘   │
│  [+ Agregar opción]          │
│  ─────────────────────────── │
│  [Guardar]  [Cancelar]       │
└──────────────────────────────┘
```

Estilo del panel lateral:
```
fixed inset-y-0 right-0 z-50
w-full max-w-[420px]
bg-white dark:bg-gray-dark shadow-card
flex flex-col
```
Overlay detrás: `fixed inset-0 bg-dark/40 z-40` (clic fuera cierra sin guardar).

**Accesibilidad del panel lateral y la tabla:**
- El panel tiene `role="dialog"` y `aria-labelledby` apuntando al `id` del título ("Editar aspecto" / "Editar pregunta").
- Al abrir el panel, el foco se mueve al primer campo del formulario (`autoFocus` en el input de Código).
- Al cerrar el panel, el foco regresa al botón ✏️ que lo abrió (guardar la ref antes de abrir).
- El overlay `bg-dark/40` lleva `aria-hidden="true"` para que los lectores de pantalla no lo anuncien.
- Los botones de acción de fila (✏️ ➕ ⬆⬇ 🗑️) llevan `aria-label` descriptivo: `"Editar [nombre del nodo]"`, `"Eliminar [nombre del nodo]"`, `"Subir [nombre del nodo]"`, `"Bajar [nombre del nodo]"`.
- Los iconos de colapso `▶/▼` llevan `aria-expanded={expandida}` y `aria-controls={id del grupo de filas}`.

**Headers de autenticación en `inspeccion.servicio.ts`:**
- Todas las funciones del servicio deben incluir `Authorization: Bearer <token>` en cada petición.
- Leer el token con el mismo helper que usa el módulo `auth` existente. Si es un Client Component, obtenerlo desde la cookie de sesión o el contexto de sesión. Si es un Server Action o Route Handler interno, usar `getServerSession()`.
- No hardcodear ni duplicar la lógica de sesión — importar el helper desde `apps/web/src/lib/sesion.ts` (o donde esté centralizado).

---

### Componentes a crear / completar

| Componente | Ubicación | Descripción |
|---|---|---|
| `Breadcrumb` | `packages/ui` | Ruta clickeable genérica: `[{ label, href? }]`. Reutilizable en todos los módulos. |
| `StripResumenPlantilla` | `_components/` | Strip fijo: tipo, puntaje máx, vigencia, badge estado, botones modo. |
| `TablaFicha` | `_components/` | Tabla jerárquica principal. Gestiona colapso de nivel 0 y estado vacío con CTA. |
| `FilaSeccion` | `_components/` | Fila PANEL. Nivel 0: `bg-primary` + toggle colapso. Nivel 1+: `bg-gray-1` indentado. |
| `FilaPregunta` | `_components/` | Fila PREGUNTA. Celdas ASPECTO (rowspan) / REQUERIMIENTOS / CRITERIO / PUNTOS. |
| `PanelEdicionNodo` | `_components/` | Panel lateral deslizable. Formulario dinámico PANEL/PREGUNTA. Guardar / Cancelar. |
| `ListaOpciones` | sub de `PanelEdicionNodo` | Gestiona `NodoOpcion[]` (agregar, editar etiqueta/puntaje, eliminar). |
| `TablaRangos` | `_components/` | Rangos editables inline. Valida solapamiento en tiempo real. |
| `DialogoConfirmacion` | `packages/ui` | Modal genérico de confirmación (título, mensaje, botón primario, botón secundario). Usado por la guardia de navegación y el eliminar nodo. |

**Props clave:**
- `FilaSeccion` y `FilaPregunta`: prop `modoEdicion: boolean` — oculta acciones en modo vista.
- `TablaFicha`: prop `nodos: NodoArbol[]` — si `[]`, muestra estado vacío con CTA.
- `PanelEdicionNodo`: prop `onGuardar(datos)` y `onCancelar()` — el panel no llama al servicio directamente; el hook es el dueño del efecto.
- `DialogoConfirmacion`: genérico, sin lógica de dominio — solo `titulo`, `mensaje`, `onConfirmar`, `onCancelar`.

---

### Función de dominio `sumarPuntajes` (nueva)

Paralela a `contarPreguntas()`, se agrega en `plantilla.entity.ts`:

```
sumarPuntajes(nodos: NodoArbol[]): number
  → recorre el árbol recursivamente
  → suma nodo.puntajeMaximo solo si nodo.tipo === "PREGUNTA"
  → los nodos PANEL no aportan puntaje directo (su puntaje es la suma de sus hijos)
```

Se re-exporta desde `packages/shared/src/utils/inspeccion.ts` para que el frontend la consuma sin duplicar la lógica. El hook `usar-editor-plantilla.ts` la llama cada vez que `plantilla.nodos` cambia.

**Estilos del indicador en el strip:**

| Situación | Clases |
|---|---|
| Suma == máximo | `text-green dark:text-green-light font-medium` con prefijo `✓` |
| Suma ≠ máximo | `text-yellow-dark font-medium` con prefijo `⚠️` |
| Sin preguntas (suma = 0) | `text-dark-4 dark:text-dark-6` con texto `— / 100 pts` |

El tooltip en el caso ⚠️ usa el atributo `title` nativo (sin librería adicional): `"Las preguntas suman X pts. El máximo declarado es Y. Ajusta los puntajes o el máximo de la ficha."`.

---

### Lógica del hook `usar-editor-plantilla.ts`

El hook centraliza todo el estado del editor. Los componentes no llaman servicios directamente.

```
Estado que maneja:
  plantilla: PlantillaCompleta | null
  cargando: boolean
  nodoActivo: NodoArbol | null       ← nodo seleccionado en el panel lateral
  panelAbierto: boolean
  formPanelDirty: boolean            ← ¿hay cambios sin guardar en el panel?
  seccionesColapsadas: Set<string>   ← ids de secciones nivel 0 colapsadas

Derivados (computados, no almacenados):
  hayCambiosPendientes               ← panelAbierto && formPanelDirty
  puntajeAcumulado                   ← sumarPuntajes(plantilla?.nodos ?? [])
  totalPreguntas                     ← contarPreguntas(plantilla?.nodos ?? [])

Acciones expuestas:
  abrirPanel(nodo)
  cerrarPanel()                      ← verifica formPanelDirty antes de cerrar
  guardarNodo(datos)                 ← llama servicio, actualiza plantilla local, recalcula derivados
  crearNodo(tipo, padreId?)
  eliminarNodo(id)
  reordenarNodos(items)
  toggleColapso(nodoId)
```

La guardia de navegación usa `hayCambiosPendientes` para mostrar `DialogoConfirmacion` antes de ejecutar cualquier `router.push()`.

---

### Tokens de la plantilla usados (resumen)

Los mismos que el login — no inventar colores nuevos.

| Clase | Uso |
|---|---|
| `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` | Contenedor de la tabla y del panel lateral |
| `bg-primary text-white` | Sección nivel 0, botón primario, puntaje destacado |
| `bg-gray-1 dark:bg-dark-2` | Subsección nivel 1 (= TableHeader de la plantilla) |
| `border-stroke dark:border-dark-3` | Bordes de tabla |
| `text-dark dark:text-white` | Texto principal |
| `text-dark-4 dark:text-dark-6` | Texto secundario |
| `border border-primary text-primary hover:bg-primary/10` | Botón outline ("Editar cabecera") |
| `bg-red-light/[0.08] text-red` | Error / validación (igual que login) |
| `text-body-sm`, `font-medium`, `font-bold`, `uppercase tracking-wide` | Tipografía |

### Tabla de rangos (`TablaRangos`)

- Cada fila editable inline: inputs `desde`, `hasta`, texto `clasificacion`, dot de color. Opciones de color usando tokens DoonFlow: `text-green` (Excelente), `text-yellow-dark` (Aceptable), `text-red` (Deficiente). Si se necesita naranja intermedio, agregar `orange` al preset de Tailwind antes de implementar — no usar `#hex` directo.
- Validación en tiempo real: si dos rangos se solapan, resaltar filas en conflicto con `border border-red` y mensaje bajo la tabla.
- Usa `validarRangos()` del dominio (re-exportada desde `packages/shared`).

---

## Contrato de API (resumen)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/inspeccion/plantillas` | Lista paginada (`?activa=true&tipo=CALIDAD&pagina=1&porPagina=20`) |
| POST | `/inspeccion/plantillas` | Crear cabecera |
| GET | `/inspeccion/plantillas/:id` | Plantilla completa con árbol de nodos y rangos |
| PATCH | `/inspeccion/plantillas/:id` | Actualizar cabecera |
| PATCH | `/inspeccion/plantillas/:id/estado` | `{ activa: boolean }` |
| DELETE | `/inspeccion/plantillas/:id` | Eliminar (cascada en nodos) |
| POST | `/inspeccion/plantillas/:id/clonar` | `{ nuevoNombre: string }` |
| POST | `/inspeccion/plantillas/:id/nodos` | Crear nodo (PANEL o PREGUNTA) |
| PATCH | `/inspeccion/plantillas/:id/nodos/:nodoId` | Actualizar nodo |
| DELETE | `/inspeccion/plantillas/:id/nodos/:nodoId` | Eliminar nodo (cascada en hijos) |
| PATCH | `/inspeccion/plantillas/:id/nodos/reordenar` | `[{ id, orden }]` |

Todos los errores siguen el envelope: `{ error: { codigo, mensaje, detalles? } }`.

---

## Estándares técnicos obligatorios

### Arquitectura hexagonal (backend)

Toda la lógica de negocio nueva de este sprint debe respetar la regla de dependencia del módulo `inspeccion`:

```
domain/          → sin imports de Express, Prisma, ni nada de infraestructura
application/     → sin imports de Express ni @prisma/client; usa solo puertos del domain
infrastructure/  → único lugar donde viven Prisma y Express; implementa los puertos
```

Verificaciones que hace `agente-qa` en cada PR:
- Ningún archivo en `domain/` o `application/` importa `express`, `@prisma/client` ni `pg`.
- El caso de uso `GestionarPlantillaUseCase` recibe el repositorio por constructor (inyección de dependencias), no lo instancia directamente.
- Los controladores solo traducen HTTP ↔ caso de uso; cero lógica de negocio en ellos.
- `sumarPuntajes()` y `validarRangos()` viven en `domain/plantilla.entity.ts`, no en el controlador ni en el repositorio.

### Clean Code

- Una función, un propósito. Si un método supera ~30 líneas, extraer funciones auxiliares con nombre descriptivo.
- Nombres en español (según convención del proyecto): `obtenerPlantillaCompleta`, `validarRangosDeResultado`, `contarPreguntasActivas`.
- Sin comentarios que expliquen *qué* hace el código — solo los que explican *por qué* existe una decisión no obvia.
- Sin código muerto ni variables sin usar. El linter (`pnpm lint`) debe pasar en verde.
- Los tests deben ser legibles sin conocer la implementación: `it("lanza PlantillaNoEncontradaError cuando el repositorio retorna null")`.

### Documentación ISO — JSDoc en funciones de dominio

Las funciones exportadas desde `domain/plantilla.entity.ts` y `packages/shared` deben tener JSDoc mínimo siguiendo estructura ISO/IEC 26514:

```
/**
 * [Qué hace en una línea]
 *
 * @param nodos - Árbol de nodos raíz de la plantilla.
 * @returns Suma de puntajeMaximo de todos los nodos PREGUNTA (recursivo). Los nodos PANEL no aportan puntaje.
 * @example
 *   sumarPuntajes([{ tipo: "PREGUNTA", puntajeMaximo: 60, hijos: [] }, ...]) // → 60
 */
export function sumarPuntajes(nodos: NodoArbol[]): number
```

- Obligatorio en: todas las funciones exportadas de `domain/`, todos los métodos del puerto `PlantillaRepositoryPort`, y todas las acciones expuestas por el hook `usar-editor-plantilla.ts`.
- Opcional (pero recomendado) en: componentes de `packages/ui` (`Breadcrumb`, `DialogoConfirmacion`).
- No requerido en: componentes internos de `_components/` del módulo (suficiente con nombres descriptivos).

---

## Notas importantes

- `agente-frontend` no toca `apps/api` — si necesita un endpoint nuevo o un cambio en el contrato, lo solicita en `memoria/sprint/` al módulo correspondiente.
- El campo `empresaId` viene del JWT (middleware de autenticación), no del body del request.
- Los nodos se eliminan en cascada en la BD — no es responsabilidad del frontend llamar delete por cada hijo.
- El orden de los nodos es un entero simple; el reordenamiento actualiza el campo `orden` de cada nodo afectado en batch (endpoint `reordenar`).
