# Guía de implementación — 009-integraciones-datos-masivos

> Referencia técnica para los agentes. Describe qué construir y dónde, sin escribir el código — el código va en el repositorio, no aquí.
> Este sprint asume 001-008 ya implementados: `clientes` (002), `sucursales` (003) y el portal público `/verificar/[codigo]` (006) existen y se reutilizan, no se reescriben.

---

## Desviaciones respecto a este documento (registradas durante la implementación, 2026-07-21)

1. **Precondición incumplida detectada antes de empezar**: el portal público `/verificar/[codigo]` de 006 nunca se implementó (sin código en el repo) y `Inspeccion.codigoVerificacion`/`fechaVencimiento` no existen porque son campos de 005, que sigue pausado. Todo lo que este documento describe como HU-3 (`ApiKey`, verificación pública, rate limiting) depende de esas dos cosas. Consultado el usuario vía `AskUserQuestion`, eligió "Implementar HU-1 y HU-2 ahora, posponer HU-3" en vez de bloquear el sprint completo o construir infraestructura sin consumidor. Ver `memoria/decisiones.md`.
2. **No se creó el modelo `ApiKey` ni la tabla `api_key`.** Solo se agregó `ImportacionLote` + enum `TipoImportacion` al schema. Ningún archivo de `domain/api-key.*`, `application/casos-uso/gestionar-api-key.usecase.ts`, `infrastructure/api-key.prisma-repository.ts` se creó.
3. **No se creó `verificar-certificacion-publica.usecase.ts`, `certificacion-publica.controller.ts`/`.router.ts`, `autenticacion-api-key.middleware.ts` ni `limitador-tasa.middleware.ts`.** `express-rate-limit` no se instaló. `/api/v1` no se montó en `apps/api/src/index.ts`.
4. **No se creó la pantalla `/configuracion/integraciones`** ni sus `_servicios`/`_hooks`/`_components` de API keys, ni el ítem "Integraciones" del sidebar — sin backend de API keys, no había nada que gestionar desde el frontend.
5. **`packages/shared/src/types/integraciones.ts` no incluye `ApiKey`/`ApiKeyCreada`** — solo los tipos usados por HU-1/HU-2 (`TipoImportacion`, `ImportacionLote`, `FilaImportacionResultado`, `ResultadoPrevisualizacion`).
6. **El botón "Importar desde Excel" de sucursales se integró en `mantenimientos/clientes/_components/seccion-sucursales.tsx`**, no en una ruta `mantenimientos/clientes/[id]/editar/page.tsx` como sugería este documento — esa ruta separada no existe en la implementación real de 003; la edición de sucursales vive como sección dentro de la página de edición del cliente.
7. **`crearModuloIntegraciones(prisma, autenticar, subidaArchivo)` instancia sus propios `ClientePrismaRepository`/`GestionarClienteUseCase` y `SucursalPrismaRepository`/`GestionarSucursalUseCase`** en vez de recibir `moduloClientes`/`moduloSucursales` ya construidos como firma este documento — evita modificar los factories de `clientes`/`sucursales` (fuera del único cambio permitido sobre esos módulos, T-396), a costa de instanciar clases stateless por segunda vez. Documentado inline en el código.
8. **Proxy Next.js implementado como un único catch-all** `apps/web/src/app/api/integraciones/[...path]/route.ts`, no como el árbol de archivos por ruta que sugiere este documento — incluye lógica de passthrough binario (revisa `Content-Type` de la respuesta; si no es `application/json`, reenvía el `arrayBuffer()` crudo) necesaria para la descarga de plantillas `.xlsx` y de detalle de errores.
9. **`type RequestConArchivo = Request`** en `integraciones.controller.ts`, no una interfaz propia extendida — una interfaz custom con `file?: {...}` chocaba (TS2430) con la augmentación global de tipos de `multer` sobre `Express.Request.file`.
10. **`detalleErrores` se castea con `as any`** en `importacion-lote.prisma-repository.ts` al escribir el campo `Json` de Prisma — el tipo `InputJsonValue` de Prisma no acepta directamente el tipo `FilaImportacionResultado[]` del dominio.
11. **Formato final de plantillas**: igual al descrito en este documento (columnas y orden), confirmado como decisión estable, sin desviación.
12. **Conteo final de tests**: 167 backend (+10 sobre el baseline de 157 tras sprint 008) / 174 frontend (+9 sobre 165), mismas 6 fallas preexistentes no relacionadas con este sprint.

---

## Archivos a crear

### Base de datos (`packages/db`)

```
prisma/
├── schema.prisma                                    ← MODIFICAR: agregar enum TipoImportacion + models ApiKey, ImportacionLote
└── migrations/
    └── YYYYMMDDHHMMSS_add_integraciones_datos_masivos/
        └── migration.sql                            ← generada por prisma migrate dev
```

**Modelos Prisma a agregar en `schema.prisma`:**
```prisma
enum TipoImportacion {
  CLIENTE
  SUCURSAL
}

/// ApiKey — credencial de un sistema externo para consumir la API pública de verificación.
model ApiKey {
  id          String    @id @default(uuid())
  empresaId   String    @map("empresa_id")
  nombre      String    @db.VarChar(150)
  claveHash   String    @map("clave_hash")
  activa      Boolean   @default(true)
  ultimoUsoEn DateTime? @map("ultimo_uso_en")
  creadoPorId String    @map("creado_por_id")
  creadoEn    DateTime  @default(now()) @map("creado_en")

  empresaRel Empresa @relation(fields: [empresaId], references: [id])
  creadoPor  Usuario @relation(fields: [creadoPorId], references: [id])

  @@index([empresaId, activa])
  @@map("api_key")
}

/// ImportacionLote — trazabilidad de cada carga masiva de Cliente/Sucursal.
model ImportacionLote {
  id             String           @id @default(uuid())
  tipo           TipoImportacion
  archivoNombre  String           @map("archivo_nombre") @db.VarChar(255)
  totalFilas     Int              @map("total_filas")
  filasExitosas  Int              @map("filas_exitosas")
  filasConError  Int              @map("filas_con_error")
  detalleErrores Json?            @map("detalle_errores")
  creadoPorId    String           @map("creado_por_id")
  creadoEn       DateTime         @default(now()) @map("creado_en")
  empresaId      String           @map("empresa_id")

  empresaRel Empresa @relation(fields: [empresaId], references: [id])
  creadoPor  Usuario @relation(fields: [creadoPorId], references: [id])

  @@index([empresaId, tipo, creadoEn])
  @@map("importacion_lote")
}
```

> Agregar también `apiKeys ApiKey[]` / `importacionLotes ImportacionLote[]` a `model Empresa`, y `apiKeysCreadas ApiKey[]` / `importacionesCreadas ImportacionLote[]` a `model Usuario` (relaciones inversas, mismo patrón que `clientes Cliente[]` ya existente en `Empresa`).

### Backend (`apps/api`)

```
src/modules/integraciones/
├── domain/
│   ├── api-key.entity.ts                  ← tipo ApiKey + generarClave() + hashClave() + verificarClave() + estaActiva()
│   ├── importacion-lote.entity.ts         ← tipo ImportacionLote + construirResumenLote()
│   ├── api-key.repository.port.ts         ← interfaz (6 métodos)
│   ├── importacion-lote.repository.port.ts← interfaz (3 métodos)
│   └── integraciones.errors.ts            ← 4 errores de dominio
├── application/
│   ├── integraciones.schema.ts            ← crearApiKeySchema + filaImportacionClienteSchema + filaImportacionSucursalSchema
│   └── casos-uso/
│       ├── gestionar-api-key.usecase.ts
│       ├── importar-clientes.usecase.ts
│       ├── importar-sucursales.usecase.ts
│       └── verificar-certificacion-publica.usecase.ts
├── infrastructure/
│   ├── api-key.prisma-repository.ts
│   ├── importacion-lote.prisma-repository.ts
│   ├── plantilla-excel.ts                 ← genera/parsea .xlsx (librería `xlsx`)
│   ├── integraciones.controller.ts        ← handlers internos (JWT)
│   ├── integraciones.router.ts            ← rutas internas bajo /integraciones
│   ├── certificacion-publica.controller.ts← handler público (API key)
│   └── certificacion-publica.router.ts    ← ruta pública bajo /api/v1
├── index.ts                               ← export crearModuloIntegraciones(prisma, autenticar, moduloClientes, moduloSucursales)
└── __tests__/
    ├── api-key.entity.test.ts
    ├── importacion-lote.entity.test.ts
    ├── gestionar-api-key.usecase.test.ts
    ├── verificar-certificacion-publica.usecase.test.ts
    ├── importar-clientes.usecase.test.ts
    └── importar-sucursales.usecase.test.ts

src/modules/clientes/
├── domain/cliente.repository.port.ts      ← MODIFICAR: agregar buscarPorIdentificacion()
└── infrastructure/cliente.prisma-repository.ts ← MODIFICAR: implementar el método nuevo

src/middleware/
├── autenticacion-api-key.middleware.ts    ← CREAR (nuevo, distinto del JWT)
└── limitador-tasa.middleware.ts           ← CREAR (express-rate-limit, solo /api/v1)
```

Líneas a agregar en `apps/api/src/index.ts`:
```typescript
import multer from "multer";
import { crearModuloIntegraciones } from "./modules/integraciones";
import { crearMiddlewareAutenticacionApiKey } from "./middleware/autenticacion-api-key.middleware";
import { crearLimitadorTasa } from "./middleware/limitador-tasa.middleware";

const subidaArchivo = multer({ storage: multer.memoryStorage() });
const autenticarApiKey = crearMiddlewareAutenticacionApiKey(prisma);
const limitadorApiPublica = crearLimitadorTasa();

const moduloIntegraciones = crearModuloIntegraciones(prisma, autenticar, moduloClientes, moduloSucursales, subidaArchivo);
app.use("/integraciones", moduloIntegraciones.router);
app.use("/api/v1", autenticarApiKey, limitadorApiPublica, moduloIntegraciones.routerPublico);
```

> `moduloSucursales` se asume ya montado por 003 con la misma forma factory que `moduloClientes` (`crearModuloSucursales(prisma, autenticar)`); `crearModuloIntegraciones` recibe sus casos de uso ya construidos, no reconstruye Prisma.

### Route Handlers proxy (Next.js)

```
apps/web/src/app/api/integraciones/
├── api-keys/
│   ├── route.ts                           ← GET (lista) + POST (crear)
│   └── [id]/
│       └── revocar/route.ts               ← POST
└── importaciones/
    ├── plantilla/route.ts                 ← GET (?tipo=CLIENTE|SUCURSAL)
    ├── clientes/
    │   ├── previsualizar/route.ts         ← POST (multipart)
    │   └── route.ts                       ← POST (multipart, confirmar)
    ├── sucursales/
    │   ├── previsualizar/route.ts         ← POST (multipart)
    │   └── route.ts                       ← POST (multipart, confirmar)
    ├── route.ts                           ← GET (historial, ?tipo=)
    └── [id]/
        └── errores/route.ts               ← GET (descarga detalle)
```

Cada handler reenvía la petición a `${API_URL}/integraciones/...` con el header `Authorization: Bearer <token>`. Los de `multipart/form-data` reenvían el `FormData` tal cual (no lo parsean en el Route Handler).

### Tipos compartidos (`packages/shared`)

```
src/types/integraciones.ts                 ← CREAR
src/index.ts                               ← MODIFICAR: re-exportar
```

```typescript
export interface ApiKey {
  id: string;
  nombre: string;
  activa: boolean;
  ultimoUsoEn?: string | null;
  creadoEn: string;
}

export interface ApiKeyCreada extends ApiKey {
  clave: string; // texto plano — solo presente en la respuesta de creación
}

export interface FilaImportacionResultado<T = Record<string, unknown>> {
  fila: number;       // número de fila en el Excel original (incluye offset de encabezado)
  datos: T;
  error?: string;
}

export interface ResultadoPrevisualizacion<T = Record<string, unknown>> {
  totalFilas: number;
  filasValidas: T[];
  filasConError: FilaImportacionResultado<T>[];
}

export interface ImportacionLote {
  id: string;
  tipo: "CLIENTE" | "SUCURSAL";
  archivoNombre: string;
  totalFilas: number;
  filasExitosas: number;
  filasConError: number;
  detalleErrores?: FilaImportacionResultado[] | null;
  creadoEn: string;
}
```

### Frontend (`apps/web`)

```
src/app/(dashboard)/configuracion/
└── integraciones/
    ├── page.tsx                           ← CREAR
    ├── _servicios/
    │   └── api-key.servicio.ts            ← CREAR
    ├── _hooks/
    │   └── usar-api-keys.ts               ← CREAR
    └── _components/
        ├── tabla-api-keys.tsx             ← CREAR
        └── modal-nueva-api-key.tsx        ← CREAR

src/app/(dashboard)/_servicios-compartidos/
└── importacion.servicio.ts                ← CREAR (usado por clientes y sucursales)

src/app/(dashboard)/_hooks-compartidos/
└── usar-importacion-excel.ts              ← CREAR

src/app/(dashboard)/_components-compartidos/
└── modal-importar-excel.tsx               ← CREAR

src/app/(dashboard)/mantenimientos/clientes/
├── page.tsx                               ← MODIFICAR: agregar botón "Importar desde Excel"
└── [id]/editar/page.tsx                   ← MODIFICAR: agregar botón "Importar desde Excel" en sección Sucursales (003)

src/app/(dashboard)/_components/sidebar.tsx← MODIFICAR: agregar ítem "Integraciones"
```

> `_servicios-compartidos/`, `_hooks-compartidos/` y `_components-compartidos/` son carpetas a nivel de `(dashboard)/`, no de un módulo específico — se usan porque el flujo de importación es idéntico para `Cliente` y `Sucursal`, solo cambia el `tipo` y la plantilla. Si `agente-frontend` prefiere un patrón distinto para compartir código entre módulos de dominio, debe escalarlo como convención transversal nueva (ver `CLAUDE.md` → regla de prioridad), no decidirlo solo en este sprint.

---

## Formato de las plantillas de importación (decisión de este sprint)

El spec dejaba el formato exacto como decisión pendiente ("a detallar junto con `agente-frontend` antes de implementar"). Se fija así:

### Plantilla `CLIENTE` (hoja "Clientes", fila 1 = encabezados)

| Columna | Encabezado | Obligatorio | Corresponde a |
|---|---|---|---|
| A | `Nombre Responsable` | Sí | `nombreResponsable` |
| B | `Empresa` | Sí | `empresa` |
| C | `Identificación Empresa` | No | `identificacionEmpresa` |
| D | `Correo 1` | Sí | `correo1` |
| E | `Correo 2` | No | `correo2` |
| F | `Correo 3` | No | `correo3` |
| G | `Dirección` | No | `direccion` |
| H | `Móvil` | No | `movil` (campo agregado en 003) |

### Plantilla `SUCURSAL` (hoja "Sucursales", fila 1 = encabezados)

| Columna | Encabezado | Obligatorio | Corresponde a |
|---|---|---|---|
| A | `Identificación Cliente` | Sí | usado para resolver `clienteId` vía `buscarPorIdentificacion()` |
| B | `Nombre Sucursal` | Sí | `nombre` |
| C | `Dirección` | No | `direccion` |
| D | `Correo` | No | `correo` |
| E | `Móvil` | No | `movil` |

Reglas de parseo (`plantilla-excel.ts`):
- Se lee siempre la **primera hoja** del archivo, sin importar su nombre.
- La fila 1 se descarta siempre (encabezado), aunque el texto no coincida exactamente — el mapeo es **posicional por columna**, no por nombre de encabezado (evita romper con archivos re-guardados o traducidos).
- Filas completamente vacías se ignoran (no cuentan en `totalFilas`).
- El número de `fila` reportado en los errores es el número real de fila de Excel (la primera fila de datos es la fila `2`).
- Formatos aceptados: `.xlsx` (prioritario). `.csv` queda fuera de este sprint si complica el parseo con `xlsx` — decisión: si la librería `xlsx` lo soporta sin esfuerzo adicional, se acepta también `.csv`; si no, solo `.xlsx` (documentar la decisión final tomada en `memoria/decisiones.md`).

---

## Contrato de API — endpoints internos (JWT, prefijo `/integraciones`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/integraciones/api-keys` | Lista las API keys de la empresa (sin `claveHash`) |
| POST | `/integraciones/api-keys` | Crea una API key — `{ nombre }` → retorna `clave` en texto plano una sola vez |
| POST | `/integraciones/api-keys/:id/revocar` | Revoca (`activa = false`) |
| GET | `/integraciones/importaciones/plantilla?tipo=CLIENTE\|SUCURSAL` | Descarga la plantilla `.xlsx` |
| POST | `/integraciones/importaciones/clientes/previsualizar` | `multipart/form-data` (`archivo`) — valida sin persistir |
| POST | `/integraciones/importaciones/clientes` | `multipart/form-data` (`archivo`) — ejecuta la importación real |
| POST | `/integraciones/importaciones/sucursales/previsualizar` | Igual, para sucursales |
| POST | `/integraciones/importaciones/sucursales` | Igual, para sucursales |
| GET | `/integraciones/importaciones?tipo=CLIENTE\|SUCURSAL` | Historial de lotes, más reciente primero |
| GET | `/integraciones/importaciones/:id/errores` | Descarga el detalle de errores del lote |

**Response — crear API key:**
```json
{
  "data": {
    "id": "uuid",
    "nombre": "ERP Cliente XYZ",
    "clave": "dk_live_9f2a1c...40 chars hex",
    "activa": true,
    "creadoEn": "2026-07-16T00:00:00.000Z"
  }
}
```

**Response — previsualizar importación:**
```json
{
  "data": {
    "totalFilas": 12,
    "filasValidas": [ { "nombreResponsable": "...", "empresa": "...", "...": "..." } ],
    "filasConError": [
      { "fila": 5, "datos": { "...": "..." }, "error": "El formato del correo electrónico no es válido." }
    ]
  }
}
```

**Response — confirmar importación (`ImportacionLote`):**
```json
{
  "data": {
    "id": "uuid",
    "tipo": "CLIENTE",
    "archivoNombre": "clientes-julio.xlsx",
    "totalFilas": 12,
    "filasExitosas": 10,
    "filasConError": 2,
    "detalleErrores": [ { "fila": 5, "error": "..." }, { "fila": 9, "error": "..." } ],
    "creadoEn": "2026-07-16T00:00:00.000Z"
  }
}
```

**Errores nuevos de este sprint:**
```json
{ "error": { "codigo": "api_key_no_encontrada", "mensaje": "La API key no existe o no pertenece a esta empresa." } }
{ "error": { "codigo": "api_key_invalida", "mensaje": "La API key no existe, es inválida o fue revocada." } }
{ "error": { "codigo": "limite_tasa_excedido", "mensaje": "Se superó el límite de solicitudes permitidas. Intenta de nuevo en unos minutos." } }
{ "error": { "codigo": "archivo_importacion_invalido", "mensaje": "El archivo está vacío o no tiene el formato esperado." } }
```

---

## Contrato de API pública — verificación externa (`GET /api/v1/certificaciones/verificar/:codigo`)

**Autenticación:** header `X-Api-Key: dk_live_...` (no JWT, no cookie de sesión — es la API pública distinta del resto del backend).

**Request:**
```
GET /api/v1/certificaciones/verificar/DFLW-2026-00042
X-Api-Key: dk_live_9f2a1c...
```

**Response 200 — encontrada:**
```json
{
  "data": {
    "codigoVerificacion": "DFLW-2026-00042",
    "estado": "VIGENTE",
    "cliente": { "empresa": "Distribuidora Sur S.A." },
    "sucursal": { "nombre": "Planta Central" },
    "plantilla": { "nombre": "Inspección Ministerio de Salud 2026" },
    "fechaEmision": "2026-03-01",
    "fechaVencimiento": "2027-03-01"
  }
}
```
Mismo subconjunto exacto de campos que ya expone el portal humano `/verificar/[codigo]` de 006 — **no se agrega ni un campo adicional** (regla de negocio 4 del spec).

**Response 200 — no encontrada (mismo tratamiento que el portal humano, no es un error 404):**
```json
{ "data": { "estado": "NO_ENCONTRADA" } }
```

**Response 401 — key inválida o revocada:**
```json
{ "error": { "codigo": "api_key_invalida", "mensaje": "La API key no existe, es inválida o fue revocada." } }
```

**Response 429 — límite de tasa excedido:**
```json
{ "error": { "codigo": "limite_tasa_excedido", "mensaje": "Se superó el límite de solicitudes permitidas. Intenta de nuevo en unos minutos." } }
```

---

## Estrategia de verificación de API key (nota técnica importante)

`claveHash` se guarda con bcrypt (igual que `passwordHash` de `usuario`). bcrypt **no es determinista** ni indexable: no se puede hacer `WHERE clave_hash = hash(claveRecibida)` directamente, porque cada `hash()` de la misma clave produce un valor distinto (salt aleatorio).

Estrategia elegida para este sprint (documentar en el PR, revisar con `agente-arquitecto` si el volumen de keys por empresa crece mucho):
1. `verificarPorClave(claveTextoPlano)` obtiene el conjunto de `ApiKey` con `activa = true` (filtrado lo más acotado posible — no hay forma de acotar más sin cambiar el modelo de almacenamiento).
2. Compara la clave recibida contra cada `claveHash` con `bcrypt.compare()` hasta encontrar coincidencia o agotar el conjunto.
3. Es aceptable para el volumen esperado (una API key por sistema externo por empresa tenant, no miles). Si en producción esto se vuelve un cuello de botella, la alternativa es guardar además un hash **determinista** corto (ej. SHA-256 truncado) solo para indexar la búsqueda, y seguir usando bcrypt para la verificación final — decisión a tomar por `agente-arquitecto` si el rendimiento lo exige, no una suposición de este sprint.

---

## Diseño de UI — Pantalla 1: Importar clientes/sucursales

Modal reutilizable (`ModalImportarExcel`), invocado desde `/mantenimientos/clientes` y desde la sección Sucursales de `/mantenimientos/clientes/[id]/editar`.

```
┌──────────────────────────────────────────────────────────┐
│  Importar clientes desde Excel                      [×]  │
│  ────────────────────────────────────────────────────    │
│                                                            │
│  Paso 1 · Preparar archivo                                │
│  1. Descarga la plantilla y complétala.                   │
│     [⬇ Descargar plantilla]                                │
│  2. Sube el archivo completo (.xlsx).                     │
│     [ Seleccionar archivo... ]   clientes-julio.xlsx      │
│                                                            │
│                          [Previsualizar →]                │
│  ────────────────────────────────────────────────────    │
│  Paso 2 · Previsualización                                │
│  ✓ 10 filas listas para importar                          │
│  ⚠ 2 filas con error                                       │
│    Fila 5 — El formato del correo electrónico no es válido│
│    Fila 9 — Ya existe un cliente con esa identificación   │
│                                                            │
│         [← Volver]              [Confirmar importación]   │
│  ────────────────────────────────────────────────────    │
│  Paso 3 · Resultado                                       │
│  ✓ Se importaron 10 clientes correctamente.                │
│  ⚠ 2 filas no se pudieron importar.                        │
│     [⬇ Descargar detalle de errores]                        │
│                                    [Cerrar]                │
└──────────────────────────────────────────────────────────┘
```

- El botón "Confirmar importación" está deshabilitado si `filasValidas.length === 0` (todas las filas tienen error).
- El botón "Descargar detalle de errores" del Paso 3 solo aparece si `filasConError > 0`.
- Cerrar el modal en cualquier paso no deja registros a medias: el Paso 2 no persiste nada (solo el Paso 3, tras "Confirmar importación", llama al endpoint de importación real).
- Overlay y contenedor: mismos tokens que `DialogoConfirmacion`/panel lateral de 001 (`bg-dark/40` overlay, `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` contenedor).

---

## Diseño de UI — Pantalla 2: Gestión de API keys (`/configuracion/integraciones`)

```
┌──────────────────────────────────────────────────────────────────┐
│ Configuración > Integraciones                        [Breadcrumb]│
├──────────────────────────────────────────────────────────────────┤
│ Integraciones                              [+ Generar nueva clave]│
│ API keys para que sistemas externos consulten certificaciones     │
├──────────────────────────────────────────────────────────────────┤
│  NOMBRE              ESTADO       ÚLTIMO USO         ACCIÓN       │
│  ────────────────────────────────────────────────────────────── │
│  ERP Cliente XYZ      ● Activa    16/07/2026 08:14   [Revocar]   │
│  Portal Auditoría CR  ○ Revocada  10/07/2026 17:02   —           │
│  ────────────────────────────────────────────────────────────── │
└──────────────────────────────────────────────────────────────────┘
```

**Modal "Generar nueva clave" — dos pantallas dentro del mismo modal:**

```
┌────────────────────────────────┐     ┌──────────────────────────────────┐
│ Generar nueva API key      [×] │     │ API key generada              [×]│
│ ─────────────────────────────  │     │ ──────────────────────────────── │
│ Nombre *                       │     │ ⚠ Copia esta clave ahora.         │
│ [____________________________] │ →   │   No se volverá a mostrar.        │
│ Ej. "ERP Cliente XYZ"          │     │                                    │
│                                 │     │ dk_live_9f2a1c...        [Copiar] │
│      [Generar]  [Cancelar]     │     │                                    │
└────────────────────────────────┘     │                        [Cerrar]   │
                                        └──────────────────────────────────┘
```

- El botón "Copiar" usa la Clipboard API del navegador; muestra confirmación breve ("Copiado") sin bloquear la UI.
- Al cerrar el modal tras ver la clave, el estado `claveRecienCreada` del hook `usar-api-keys.ts` se limpia — reabrir el modal para generar otra clave nunca muestra una clave anterior.
- Badge "Activa": `bg-green-light/[0.08] text-green` (mismos tokens que `Cliente`/`Sucursal`). Badge "Revocada": `bg-gray-3 text-dark-5` (mismos tokens que "Inactivo").

---

## Tokens de diseño DoonFlow (reutilizados, no se crean nuevos)

| Elemento | Clases Tailwind |
|---|---|
| Contenedor de tabla/modal | `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` |
| Overlay de modal | `fixed inset-0 bg-dark/40 z-40` (`aria-hidden="true"`) |
| Badge Activa/Vigente | `bg-green-light/[0.08] text-green text-body-xs font-medium px-2.5 py-0.5 rounded-full` |
| Badge Revocada/Inactiva | `bg-gray-3 text-dark-5 text-body-xs font-medium px-2.5 py-0.5 rounded-full` |
| Aviso de advertencia (clave visible una vez) | `bg-yellow-light/[0.08] text-yellow-dark rounded-lg px-3 py-2 text-body-sm` |
| Botón primario | `variante="primario"` del componente `Boton` de `packages/ui` |
| Input de archivo | mismo estilo de input que `formulario-cliente.tsx`: `w-full rounded-lg border border-stroke px-3 py-2 text-sm focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white` |
| Fila de error de previsualización | `bg-red-light/[0.08] text-red rounded-md px-3 py-1.5 text-body-sm` |

---

## Arquitectura hexagonal — módulo `integraciones`

```
domain/        → ApiKey/ImportacionLote + generarClave()/hashClave()/verificarClave() + construirResumenLote() + errores + puertos
application/   → GestionarApiKeyUseCase, ImportarClientesUseCase, ImportarSucursalesUseCase, VerificarCertificacionPublicaUseCase — sin Express, Prisma, multer ni xlsx
infrastructure/→ Repositorios Prisma, plantilla-excel.ts (único lugar con `xlsx`), controllers y routers (único lugar con Express)
```

- `ImportarClientesUseCase` e `ImportarSucursalesUseCase` **componen** los casos de uso ya existentes de `clientes`/`sucursales` (`GestionarClienteUseCase.crear()`, `GestionarSucursalUseCase.crear()`) en vez de reimplementar sus reglas de validación — evita duplicar `validarEmail`, unicidad de `identificacionEmpresa`, etc.
- El middleware de API key no vive dentro del módulo `integraciones` — vive en `apps/api/src/middleware/` porque es infraestructura transversal (mismo criterio que `autenticacion.middleware.ts`), aunque el caso de uso que consulta (`GestionarApiKeyUseCase.verificarPorClave()`) sí vive en el módulo.
- Mismo patrón factory que `clientes`/`inspeccion`:
  ```typescript
  export function crearModuloIntegraciones(
    prisma: PrismaClient,
    autenticar: Middleware,
    moduloClientes: { casoDeUso: GestionarClienteUseCase; repo: ClienteRepositoryPort },
    moduloSucursales: { casoDeUso: GestionarSucursalUseCase },
    subidaArchivo: Multer,
  ) {
    const repoApiKey = new ApiKeyPrismaRepository(prisma);
    const repoLote = new ImportacionLotePrismaRepository(prisma);
    const ucApiKey = new GestionarApiKeyUseCase(repoApiKey);
    const ucImportarClientes = new ImportarClientesUseCase(repoLote, moduloClientes.casoDeUso);
    const ucImportarSucursales = new ImportarSucursalesUseCase(repoLote, moduloSucursales.casoDeUso, moduloClientes.repo);
    const ucVerificar = new VerificarCertificacionPublicaUseCase(prisma); // o el puerto que 006 ya expone
    const ctrl = new IntegracionesController(ucApiKey, ucImportarClientes, ucImportarSucursales, repoLote);
    const ctrlPublico = new CertificacionPublicaController(ucVerificar, ucApiKey);
    return {
      router: crearIntegracionesRouter(ctrl, autenticar, subidaArchivo),
      routerPublico: crearCertificacionPublicaRouter(ctrlPublico),
    };
  }
  ```

---

## Estándares técnicos obligatorios

### Clean Code

- Una función, un propósito. Si un caso de uso supera ~40 líneas, extraer funciones de dominio (ver regla general de `CLAUDE.md`).
- Nombres en español: `generarClave`, `verificarPorClave`, `construirResumenLote`, `parsearArchivoClientes`.
- Sin comentarios de "qué hace" — solo los que documentan una decisión no obvia (ej. la estrategia de verificación de API key con bcrypt no indexable, ver sección dedicada arriba).
- `pnpm lint` debe pasar en verde en `apps/api` y `apps/web`.

### Documentación ISO — JSDoc en funciones de dominio

Obligatorio en todas las funciones exportadas de `domain/api-key.entity.ts`, `domain/importacion-lote.entity.ts`, y en todos los métodos de `ApiKeyRepositoryPort`/`ImportacionLoteRepositoryPort`, siguiendo el mismo formato ISO/IEC 26514 usado en 001:

```
/**
 * Genera una clave de API en texto plano con prefijo dk_live_.
 *
 * @returns Objeto con la clave en texto plano. El llamador es responsable
 *          de hashearla antes de persistir y de no loguearla nunca.
 * @example
 *   generarClave() // → { claveTextoPlano: "dk_live_9f2a1c..." }
 */
export function generarClave(): { claveTextoPlano: string }
```

---

## Notas importantes

- `agente-frontend` no toca `apps/api` — si necesita ajustar el contrato de un endpoint de este sprint, lo solicita en `memoria/sprint/` antes de asumir un cambio.
- El `empresaId` de los endpoints internos viene siempre del JWT (`req.usuario.empresaId`); el `empresaId` de la API pública viene siempre de la `ApiKey` autenticada (`req.empresaIdApiKey`) — nunca de un parámetro de la URL o del body, para que un integrador no pueda pedir datos de otra empresa cambiando un parámetro.
- La clave en texto plano de una `ApiKey` no se loguea nunca (ni en `console.log`, ni en logs de errores, ni en el cuerpo de excepciones capturadas) — solo viaja en la respuesta HTTP de creación.
- Multer se configura en memoria (`memoryStorage`), no en disco — los archivos de importación no necesitan persistirse como archivo, solo su resultado (`ImportacionLote.detalleErrores`).
- Este sprint no incluye importación de certificaciones/histórico ni webhooks salientes (fuera de alcance explícito del spec) — no se agregan endpoints para eso aunque parezca natural extenderlo.
