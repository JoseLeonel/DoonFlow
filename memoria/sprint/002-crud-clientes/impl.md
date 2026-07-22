# Guía de implementación — 002-crud-clientes

> Referencia técnica para los agentes. Describe qué construir y dónde, sin escribir el código.

---

## Archivos a crear

### Base de datos (`packages/db`)

```
prisma/
├── schema.prisma                          ← MODIFICAR: agregar model Cliente
├── migrations/
│   └── YYYYMMDDHHMMSS_add_clientes/
│       └── migration.sql                  ← generada por prisma migrate dev
└── seeds/
    └── clientes-demo.ts                   ← CREAR: 3 clientes demo
```

**Modelo Prisma a agregar en `schema.prisma`:**
```prisma
model Cliente {
  id                    String   @id @default(uuid())
  empresaId             String   @map("empresa_id")
  nombreResponsable     String   @map("nombre_responsable") @db.VarChar(200)
  empresa               String   @db.VarChar(200)
  identificacionEmpresa String?  @map("identificacion_empresa") @db.VarChar(50)
  correo1               String   @db.VarChar(150)
  correo2               String?  @db.VarChar(150)
  correo3               String?  @db.VarChar(150)
  direccion             String?  @db.VarChar(300)
  activo                Boolean  @default(true)
  creadoEn              DateTime @default(now()) @map("creado_en")
  actualizadoEn         DateTime @updatedAt @map("actualizado_en")

  empresaRel Empresa @relation(fields: [empresaId], references: [id])

  @@index([empresaId, activo])
  @@map("cliente")
}
```

> Nota: el índice único de `identificacionEmpresa` se crea como índice parcial en SQL puro
> (`WHERE identificacion_empresa IS NOT NULL`) dentro del archivo de migración, ya que Prisma
> no soporta índices únicos parciales directamente.

### Backend (`apps/api`)

```
src/modules/clientes/
├── domain/
│   ├── cliente.entity.ts                  ← tipo Cliente + validarEmail() + puedeSeleccionarse()
│   ├── cliente.repository.port.ts         ← interfaz con 5 métodos
│   └── cliente.errors.ts                  ← 3 errores de dominio
├── application/
│   ├── cliente.schema.ts                  ← crearClienteSchema + actualizarClienteSchema
│   └── casos-uso/
│       └── gestionar-cliente.usecase.ts   ← 5 métodos del caso de uso
├── infrastructure/
│   ├── cliente.prisma-repository.ts       ← implementa el puerto
│   ├── cliente.controller.ts              ← 6 handlers Express
│   └── clientes.router.ts                 ← monta las rutas con middleware autenticar
├── index.ts                               ← export crearModuloClientes(prisma, autenticar)
└── __tests__/
    ├── cliente.entity.test.ts
    └── gestionar-cliente.usecase.test.ts
```

Líneas a agregar en `apps/api/src/index.ts`:
```typescript
import { crearModuloClientes } from "./modules/clientes";
const moduloClientes = crearModuloClientes(prisma, autenticar);
app.use("/clientes", moduloClientes.router);
```

### Route Handlers proxy (`apps/web`)

```
src/app/api/clientes/
├── route.ts                               ← GET (lista) + POST (crear)
└── [id]/
    ├── route.ts                           ← GET + PATCH
    ├── activar/route.ts                   ← POST
    └── desactivar/route.ts                ← POST
```

Cada handler reenvía la petición a `${API_URL}/clientes/...` con el header `Authorization: Bearer <token>`.

### Tipos compartidos (`packages/shared`)

```
src/types/cliente.ts                       ← CREAR
src/index.ts                               ← MODIFICAR: re-exportar types/cliente.ts
```

**Tipos a definir:**
```typescript
export interface Cliente {
  id: string;
  empresaId: string;
  nombreResponsable: string;
  empresa: string;
  identificacionEmpresa?: string;
  correo1: string;
  correo2?: string;
  correo3?: string;
  direccion?: string;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}
```

### Frontend (`apps/web`)

```
src/app/(dashboard)/mantenimientos/
├── page.tsx                               ← MODIFICAR: agregar tarjeta "Clientes"
└── clientes/
    ├── page.tsx                           ← CREAR: página lista
    ├── nuevo/
    │   └── page.tsx                       ← CREAR: página agregar
    ├── [id]/
    │   └── editar/
    │       └── page.tsx                   ← CREAR: página modificar
    ├── _servicios/
    │   └── cliente.servicio.ts            ← CREAR
    ├── _hooks/
    │   └── usar-clientes.ts               ← CREAR
    └── _components/
        ├── tabla-clientes.tsx             ← CREAR
        └── formulario-cliente.tsx         ← CREAR (compartido por nuevo y editar)
```

---

## Diseño de UI

### Lista de clientes (`/mantenimientos/clientes`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Mantenimientos > Clientes                                    [Breadcrumb] │
├──────────────────────────────────────────────────────────────────────────┤
│ Clientes                                          [+ Agregar cliente]     │
│ Personas de contacto y empresas registradas                               │
├──────────────────────────────────────────────────────────────────────────┤
│  EMPRESA          RESPONSABLE      IDENTIFICACIÓN   CORREO        ESTADO  ACCIÓN│
│  ─────────────────────────────────────────────────────────────────────── │
│  Dist. Sur S.A.   Juan Pérez       3-101-222333    jp@dist.com  ● Activo  [Modificar]│
│  Agro Norte S.A.  María Solís      3-200-333444    ms@agro.com  ● Activo  [Modificar]│
│  Frutas CR Ltda.  Carlos Mora      —               cm@frutas.com ○ Inact. [Modificar]│
│  ─────────────────────────────────────────────────────────────────────── │
└──────────────────────────────────────────────────────────────────────────┘
```

- El botón **"+ Agregar cliente"** está siempre visible en la esquina superior derecha de la sección.
- El botón **"Modificar"** en cada fila es el único control de acción visible (sin iconos sueltos).
- La columna Identificación muestra `—` cuando no tiene valor.

### Formulario agregar / modificar

```
┌────────────────────────────────────────────────────────────┐
│ Mantenimientos > Clientes > Nuevo cliente      [Breadcrumb]│
├────────────────────────────────────────────────────────────┤
│ Nuevo cliente                                              │
│ ─────────────────────────────────────────────────────────  │
│                                                            │
│  Nombre completo (persona responsable) *                   │
│  [__________________________________________]              │
│                                                            │
│  Empresa *                                                 │
│  [__________________________________________]              │
│                                                            │
│  Identificación empresa                                    │
│  [__________________________________________]              │
│                                                            │
│  Dirección                                                 │
│  [__________________________________________]              │
│  [__________________________________________]              │
│                                                            │
│  ── Correos electrónicos ─────────────────────────────── │
│  Correo 1 *  [______________________________________]     │
│  Correo 2    [______________________________________]     │
│  Correo 3    [______________________________________]     │
│                                                            │
│  ─────────────────────────────────────────────────────── │
│  [   Guardar   ]                       [   Cancelar   ]   │
└────────────────────────────────────────────────────────────┘
```

En modo **editar**, el encabezado muestra además el badge de estado:
```
│ Dist. Sur S.A.                            ● Activo         │
```

---

## Contrato de API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/clientes` | Lista todos los clientes de la empresa (sin paginación) |
| POST | `/clientes` | Crear cliente |
| GET | `/clientes/:id` | Obtener cliente por id |
| PATCH | `/clientes/:id` | Actualizar campos (todos opcionales) |
| POST | `/clientes/:id/activar` | Activar cliente |
| POST | `/clientes/:id/desactivar` | Desactivar cliente |

**Request body — crear:**
```json
{
  "nombreResponsable": "Juan Pérez",
  "empresa": "Distribuidora Sur S.A.",
  "identificacionEmpresa": "3-101-222333",
  "correo1": "juan@distsur.com",
  "correo2": "ventas@distsur.com",
  "correo3": null,
  "direccion": "San José, Costa Rica"
}
```

**Response exitosa:**
```json
{
  "data": {
    "id": "uuid",
    "empresaId": "uuid",
    "nombreResponsable": "Juan Pérez",
    "empresa": "Distribuidora Sur S.A.",
    "identificacionEmpresa": "3-101-222333",
    "correo1": "juan@distsur.com",
    "correo2": "ventas@distsur.com",
    "correo3": null,
    "direccion": "San José, Costa Rica",
    "activo": true,
    "creadoEn": "2026-06-22T00:00:00.000Z",
    "actualizadoEn": "2026-06-22T00:00:00.000Z"
  }
}
```

**Errores:**
```json
{ "error": { "codigo": "cliente_no_encontrado", "mensaje": "El cliente no existe o no pertenece a esta empresa." } }
{ "error": { "codigo": "email_invalido", "mensaje": "El formato del correo electrónico no es válido." } }
{ "error": { "codigo": "identificacion_duplicada", "mensaje": "Ya existe un cliente con esa identificación en esta empresa." } }
```

---

## Tokens de diseño DoonFlow

| Elemento | Clases Tailwind |
|---|---|
| Contenedor de tabla y formulario | `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` |
| Badge Activo | `bg-green-light/[0.08] text-green text-body-xs font-medium px-2.5 py-0.5 rounded-full` |
| Badge Inactivo | `bg-gray-3 text-dark-5 text-body-xs font-medium px-2.5 py-0.5 rounded-full` |
| Botón Modificar | `text-sm font-medium text-primary hover:underline` (o `variante="secundario"` del `Boton` de UI) |
| Botón Agregar cliente | `variante="primario"` del componente `Boton` de `packages/ui` |
| Input campo | `w-full rounded-lg border border-stroke px-3 py-2 text-sm text-dark focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white` |
| Skeleton | `h-10 animate-pulse rounded bg-gray-2 dark:bg-dark-3` |
| Separador de sección | `text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6` |

---

## Arquitectura hexagonal — módulo `clientes`

```
domain/        → Cliente + validarEmail() + puedeSeleccionarse() + errores
application/   → GestionarClienteUseCase + schemas Zod — sin Express ni Prisma
infrastructure/→ ClientePrismaRepository + ClienteController + ClientesRouter
```

- El controlador extrae `empresaId` de `req.usuario!.empresaId` (middleware de autenticación).
- El repositorio aplica `where: { empresaId }` en cada query.
- `validarEmail` vive en `domain/` y es llamada desde el caso de uso, no desde el controlador.
- Mismo patrón factory que el módulo `inspeccion`:
  ```typescript
  export function crearModuloClientes(prisma: PrismaClient, autenticar: Middleware) {
    const repo = new ClientePrismaRepository(prisma);
    const uc = new GestionarClienteUseCase(repo);
    const ctrl = new ClienteController(uc);
    const router = crearClientesRouter(ctrl, autenticar);
    return { router };
  }
  ```
