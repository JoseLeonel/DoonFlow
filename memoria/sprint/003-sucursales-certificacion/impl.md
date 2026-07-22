# Guía de implementación — 003-sucursales-certificacion

> Referencia técnica para los agentes. Describe qué construir y dónde, sin escribir el código — el código va en el repositorio, no aquí.
> Este sprint construye sobre 001 (`inspeccion`, ya implementado) y 002 (`clientes`, ya implementado). No recrea nada existente.

---

## Archivos a crear / completar

### Base de datos (`packages/db`)

```
prisma/
├── schema.prisma                          ← MODIFICAR:
│                                              - agregar `movil` a model Cliente
│                                              - agregar model Sucursal
│                                              - agregar `sucursalId` + relación a model Usuario
│                                              - agregar model UsuarioSucursalAcceso
│                                              - agregar `sucursalId` + relación a model Inspeccion
├── migrations/
│   └── YYYYMMDDHHMMSS_add_sucursales/
│       └── migration.sql                  ← generada por prisma migrate dev
└── seeds/
    └── sucursales-demo.ts                 ← CREAR: sucursales demo sobre clientes-demo.ts
```

**Modelo Prisma a agregar — `Sucursal`:**
```prisma
model Sucursal {
  id            String   @id @default(uuid())
  empresaId     String   @map("empresa_id")
  clienteId     String   @map("cliente_id")
  nombre        String   @db.VarChar(150)
  direccion     String?  @db.VarChar(300)
  correo        String?  @db.VarChar(150)
  movil         String?  @db.VarChar(20)
  activo        Boolean  @default(true)
  creadoEn      DateTime @default(now()) @map("creado_en")
  actualizadoEn DateTime @updatedAt @map("actualizado_en")

  cliente  Cliente  @relation(fields: [clienteId], references: [id])
  usuarios Usuario[] @relation("SucursalPrincipal")
  accesos  UsuarioSucursalAcceso[]

  @@index([empresaId, clienteId, activo])
  @@map("sucursal")
}
```

**Modificación a `Cliente`:** agregar `movil String? @db.VarChar(20)` y `sucursales Sucursal[]` (relación inversa). No se toca ningún otro campo ni se recrea la tabla.

**Modificación a `Usuario`:** agregar `sucursalId String? @map("sucursal_id")`, relación `sucursalPrincipal Sucursal? @relation("SucursalPrincipal", fields: [sucursalId], references: [id])`, y `accesosSucursal UsuarioSucursalAcceso[]`.

**Modelo Prisma a agregar — `UsuarioSucursalAcceso`:**
```prisma
model UsuarioSucursalAcceso {
  usuarioId  String   @map("usuario_id")
  sucursalId String   @map("sucursal_id")
  creadoEn   DateTime @default(now()) @map("creado_en")

  usuario  Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  sucursal Sucursal @relation(fields: [sucursalId], references: [id], onDelete: Cascade)

  @@id([usuarioId, sucursalId])
  @@map("usuario_sucursal_acceso")
}
```

**Modificación a `Inspeccion`:** agregar `sucursalId String? @map("sucursal_id")` y relación opcional a `Sucursal` — solo modelo de datos, sin caso de uso que la escriba todavía (eso pertenece al sprint futuro de ejecución RF-08).

> Nota: al igual que en 002, cualquier índice único parcial se agrega en SQL puro dentro del archivo de migración generado, no vía atributos de Prisma.

### Backend — módulo `sucursales` (`apps/api`)

```
src/modules/sucursales/
├── domain/
│   ├── sucursal.entity.ts                 ← CREAR: tipo Sucursal + validarCorreo() + puedeSeleccionarse()
│   ├── sucursal.repository.port.ts        ← CREAR: interfaz con 7 métodos
│   └── sucursal.errors.ts                 ← CREAR: 3 errores de dominio
├── application/
│   ├── sucursal.schema.ts                 ← CREAR: crearSucursalSchema + actualizarSucursalSchema
│   └── casos-uso/
│       └── gestionar-sucursal.usecase.ts  ← CREAR: 7 métodos del caso de uso
├── infrastructure/
│   ├── sucursal.prisma-repository.ts      ← CREAR: implementa el puerto
│   ├── sucursal.controller.ts             ← CREAR: 7 handlers Express
│   └── sucursales.router.ts               ← CREAR: monta las rutas con middleware autenticar
├── index.ts                               ← CREAR: export crearModuloSucursales(prisma, autenticar)
└── __tests__/
    ├── sucursal.entity.test.ts
    └── gestionar-sucursal.usecase.test.ts
```

`GestionarSucursalUseCase` recibe **dos** puertos por constructor: `SucursalRepositoryPort` y `ClienteRepositoryPort` (del módulo `clientes` ya existente) — este último solo para validar que el `clienteId` recibido exista en la empresa antes de crear la sucursal. No se importa el módulo `clientes` completo, solo su puerto de dominio (`import type { ClienteRepositoryPort } from "../../clientes/domain/cliente.repository.port"`), que es una interfaz sin dependencias de infraestructura.

Líneas a agregar en `apps/api/src/index.ts`:
```typescript
import { crearModuloSucursales } from "./modules/sucursales";
const moduloSucursales = crearModuloSucursales(prisma, autenticar);
app.use("/sucursales", moduloSucursales.router);
```

### Backend — módulo `clientes` (extensión para `movil`)

```
src/modules/clientes/
├── domain/cliente.entity.ts               ← MODIFICAR: agregar `movil?: string | null`
├── application/cliente.schema.ts          ← MODIFICAR: agregar `movil` opcional
└── infrastructure/cliente.prisma-repository.ts ← MODIFICAR: incluir `movil` en mapear()
```

### Backend — módulo `auth` (extensión para Usuario ↔ Sucursal)

```
src/modules/auth/
├── domain/
│   ├── usuario.entity.ts                  ← MODIFICAR: sucursalId, sucursalesAdicionalesIds,
│   │                                          requiereSucursalAsignada(), tieneAsignacionValida()
│   ├── usuario.repository.port.ts         ← MODIFICAR: +3 métodos
│   └── auth.errors.ts                     ← MODIFICAR: + SucursalNoAsignadaError
├── application/
│   ├── auth.schema.ts                     ← MODIFICAR: + actualizarAsignacionSucursalesSchema
│   └── casos-uso/
│       └── gestionar-acceso-sucursal.usecase.ts ← CREAR
└── infrastructure/
    └── usuario.prisma-repository.ts       ← MODIFICAR: implementar los 3 métodos nuevos
```

> **Sin controller/router ni montaje HTTP en este sprint.** `usuarios.controller.ts`, `usuarios.router.ts` y el `app.use("/usuarios", ...)` los crea [[004-usuarios-roles-alcance]] como parte de su CRUD completo de usuarios — ese router incluirá los campos de asignación de sucursales usando el puerto de dominio ya listo aquí. Crear un segundo router montado en la misma ruta `/usuarios` produciría un choque real de archivos (`apps/api/src/index.ts` no puede montar dos módulos en el mismo path) y de proxy Next.js (`apps/web/src/app/api/usuarios/route.ts` no puede tener dos implementaciones).

### Route Handlers proxy (Next.js, `apps/web`)

```
src/app/api/sucursales/
├── route.ts                               ← GET (lista por clienteId) + POST (crear)
└── [id]/
    ├── route.ts                           ← GET + PATCH
    ├── activar/route.ts                   ← POST
    ├── desactivar/route.ts                ← POST
    └── historico/route.ts                 ← GET
```

Cada handler reenvía la petición a `${API_URL}/sucursales/...` con el header `Authorization: Bearer <token>`, mismo patrón que `src/app/api/clientes/`. El proxy `apps/web/src/app/api/usuarios/` (incluida la asignación de sucursales) lo crea [[004-usuarios-roles-alcance]] — no se toca aquí.

### Tipos compartidos (`packages/shared`)

```
src/types/cliente.ts                       ← MODIFICAR: agregar `movil?: string | null`
src/types/sucursal.ts                      ← CREAR: Sucursal + RegistroCertificacion
src/index.ts                               ← MODIFICAR: re-exportar types/sucursal.ts
```

**Tipos a definir en `sucursal.ts`:**
```typescript
export interface Sucursal {
  id: string;
  empresaId: string;
  clienteId: string;
  nombre: string;
  direccion?: string | null;
  correo?: string | null;
  movil?: string | null;
  activo: boolean;
  puntajeVigente?: number | null;
  clasificacionVigente?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface RegistroCertificacion {
  fecha: string;
  plantillaNombre: string;
  puntajeObtenido: number;
  puntajeMaximo: number;
  clasificacion: string | null;
}
```

### Frontend — Sucursales dentro de Clientes (`apps/web`)

```
src/app/(dashboard)/mantenimientos/clientes/
├── [id]/
│   ├── editar/page.tsx                    ← MODIFICAR: agregar sección "Sucursales"
│   └── sucursales/
│       └── [sucursalId]/
│           └── page.tsx                   ← CREAR: histórico de certificaciones
├── _servicios/
│   ├── cliente.servicio.ts                ← EXISTE (sin cambios: movil viaja dentro del objeto Cliente)
│   └── sucursal.servicio.ts               ← CREAR
├── _hooks/
│   ├── usar-clientes.ts                   ← EXISTE (sin cambios)
│   ├── usar-sucursales.ts                 ← CREAR
│   └── usar-historico-sucursal.ts         ← CREAR
└── _components/
    ├── formulario-cliente.tsx             ← MODIFICAR: agregar campo Móvil
    ├── tabla-sucursales.tsx               ← CREAR
    ├── formulario-sucursal.tsx            ← CREAR
    └── tabla-historico-certificaciones.tsx ← CREAR
```

### Asignación de sucursales a usuarios — sin árbol de archivos frontend propio

No se crea `apps/web/src/app/(dashboard)/usuarios/` en este sprint. [[004-usuarios-roles-alcance]] construye `/mantenimientos/usuarios` (lista + CRUD completo) y ahí mismo el selector de sucursal principal/adicionales dentro de `FormularioUsuario`, reutilizando `Sucursal`/`RegistroCertificacion` de `packages/shared/src/types/sucursal.ts` (creado en este sprint) y el puerto de dominio de `usuario.repository.port.ts` (también de este sprint). El ítem de sidebar "Usuarios" lo agrega 004, no este sprint.

### Backend — Tests (`apps/api`)

```
src/modules/sucursales/__tests__/
├── sucursal.entity.test.ts                ← CREAR (Vitest puro, sin mocks)
└── gestionar-sucursal.usecase.test.ts     ← CREAR (Vitest + mock de ambos repositorios)

src/modules/auth/__tests__/
├── usuario.entity.test.ts                 ← MODIFICAR (agregar casos de requiereSucursalAsignada/tieneAsignacionValida)
└── gestionar-acceso-sucursal.usecase.test.ts ← CREAR
```

### Frontend — Tests (`apps/web`)

```
src/app/(dashboard)/mantenimientos/clientes/__tests__/
├── tabla-sucursales.test.tsx              ← CREAR
├── formulario-sucursal.test.tsx           ← CREAR
└── tabla-historico-certificaciones.test.tsx ← CREAR
```

`formulario-asignacion-sucursales.test.tsx` no se crea en este sprint — vive junto a `FormularioUsuario` en [[004-usuarios-roles-alcance]].

---

## Diseño de UI

No hay editor visual complejo en este sprint (a diferencia de 001) — son tablas, formularios y una vista de histórico, con el mismo nivel de detalle que 002.

### Sección "Sucursales" en edición de cliente (`/mantenimientos/clientes/[id]/editar`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Mantenimientos > Clientes > Distribuidora Sur S.A.          [Breadcrumb] │
├──────────────────────────────────────────────────────────────────────────┤
│ Distribuidora Sur S.A.                              ● Activo             │
│ ─────────────────────────────────────────────────────────────────────── │
│  (formulario de datos del cliente — con el nuevo campo Móvil)            │
│  Nombre completo * | Empresa * | Identificación | Dirección              │
│  Correo 1 * | Correo 2 | Correo 3 | Móvil                                │
│  [Guardar]                                        [Cancelar]             │
├──────────────────────────────────────────────────────────────────────────┤
│ Sucursales                                       [+ Agregar sucursal]    │
│ ─────────────────────────────────────────────────────────────────────── │
│  NOMBRE          DIRECCIÓN      CORREO         MÓVIL     PUNTAJE  ESTADO  ACCIONES        │
│  Planta Central  San José       pc@dist.com    8888-0001   92     ●Activo [Modificar][Ver historial][Desactivar]│
│  Sucursal Norte  Alajuela       —              —            —     ●Activo [Modificar][Ver historial][Desactivar]│
│  ─────────────────────────────────────────────────────────────────────── │
└──────────────────────────────────────────────────────────────────────────┘
```

- La columna PUNTAJE muestra `—` en `text-dark-4 dark:text-dark-6` cuando `puntajeVigente` es `null`; si tiene valor, se muestra en `text-primary font-bold` (mismo estilo que la columna PUNTOS de la ficha de 001).
- "+ Agregar sucursal" abre `FormularioSucursal` en un panel lateral (mismo patrón `fixed inset-y-0 right-0` que `PanelEdicionNodo` de 001) o modal centrado — decisión de `agente-frontend` según el componente disponible en `packages/ui`, manteniendo consistencia con el resto del módulo `mantenimientos`.

### Formulario de sucursal (crear/editar)

```
┌────────────────────────────────┐
│ Nueva sucursal            [×]  │
│ ─────────────────────────────  │
│ Nombre *      [_____________]  │
│ Dirección     [_____________]  │
│ Correo        [_____________]  │
│ Móvil         [_____________]  │
│ ─────────────────────────────  │
│ [Guardar]        [Cancelar]    │
└────────────────────────────────┘
```

Mismos tokens de input y botones que `formulario-cliente.tsx` (`packages/config/tailwind/preset.ts`, ver tabla de tokens de 002).

### Histórico de certificaciones (`/mantenimientos/clientes/[id]/sucursales/[sucursalId]`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Mantenimientos > Clientes > Distribuidora Sur S.A. > Planta Central      │
│  > Historial                                                [Breadcrumb] │
├──────────────────────────────────────────────────────────────────────────┤
│ Historial de certificaciones — Planta Central                            │
│ Certificación vigente: 92 / 100 pts · Excelente                          │
│ ─────────────────────────────────────────────────────────────────────── │
│  FECHA        PLANTILLA                    PUNTAJE     CLASIFICACIÓN     │
│  15/06/2026   Inspección Min. Salud 2026    92 / 100    Excelente        │
│  10/03/2026   Inspección Min. Salud 2026    78 / 100    Aceptable        │
│  ─────────────────────────────────────────────────────────────────────── │
└──────────────────────────────────────────────────────────────────────────┘
```

- Tarjeta de "Certificación vigente" con el mismo contenedor base (`rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card`) que las cards de dashboard descritas en `CLAUDE.md`.
- Estado vacío: ícono + "Esta sucursal no tiene inspecciones registradas" (mismo patrón que el estado vacío de `TablaFicha` en 001 y `TablaClientes` en 002).

### Referencia visual para [[004-usuarios-roles-alcance]] — sección de sucursales dentro de `FormularioUsuario`

> Este mockup no se construye en este sprint (no hay pantalla `/usuarios` propia aquí, ver nota más arriba). Se deja como referencia de cómo se ve la sección de sucursales dentro del formulario de usuario que sí construye 004, para que ese sprint no tenga que rediseñarla desde cero.

```
┌────────────────────────────────────────────────────────────┐
│ Usuarios > María Solís                          [Breadcrumb]│
├────────────────────────────────────────────────────────────┤
│ María Solís                                    ● Activo     │
│ maria@agro.com · Rol: Auditor                               │
│ ─────────────────────────────────────────────────────────  │
│ Sucursales                                                  │
│                                                              │
│  Sucursal principal *                                       │
│  [ Planta Central                                       ▼ ] │
│                                                              │
│  Sucursales adicionales con acceso de consulta               │
│  [x] Sucursal Norte      [ ] Planta Frutas CR                │
│                                                              │
│  [Guardar]                                                  │
└────────────────────────────────────────────────────────────┘
```

- Si el rol es de alcance total (`administrador`): la sección "Sucursales" se reemplaza por un aviso `bg-gray-1 dark:bg-dark-2 text-dark-4 dark:text-dark-6 rounded-lg p-4` con el texto "Este rol tiene acceso a todas las sucursales." — sin selectores.
- En 004, nombre/correo/rol dejan de ser de solo lectura (ese sprint sí construye el CRUD completo) — este mockup solo ilustra la sección de sucursales.

---

## Contrato de API (resumen)

### Sucursales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/sucursales?clienteId=` | Lista sucursales del cliente, con `puntajeVigente`/`clasificacionVigente` |
| POST | `/sucursales` | Crear sucursal (`clienteId` en el body) |
| GET | `/sucursales/:id` | Obtener sucursal por id |
| PATCH | `/sucursales/:id` | Actualizar campos (`clienteId` no editable) |
| POST | `/sucursales/:id/activar` | Activar sucursal |
| POST | `/sucursales/:id/desactivar` | Desactivar sucursal |
| GET | `/sucursales/:id/historico` | `{ registros: RegistroCertificacion[], puntajeVigente: number \| null, clasificacionVigente: string \| null }` |

**Request body — crear:**
```json
{
  "clienteId": "uuid",
  "nombre": "Planta Central",
  "direccion": "San José, Costa Rica",
  "correo": "pc@distsur.com",
  "movil": "8888-0001"
}
```

**Response exitosa (crear/obtener):**
```json
{
  "data": {
    "id": "uuid",
    "empresaId": "uuid",
    "clienteId": "uuid",
    "nombre": "Planta Central",
    "direccion": "San José, Costa Rica",
    "correo": "pc@distsur.com",
    "movil": "8888-0001",
    "activo": true,
    "puntajeVigente": null,
    "clasificacionVigente": null,
    "creadoEn": "2026-07-16T00:00:00.000Z",
    "actualizadoEn": "2026-07-16T00:00:00.000Z"
  }
}
```

**Errores:**
```json
{ "error": { "codigo": "sucursal_no_encontrada", "mensaje": "La sucursal no existe o no pertenece a esta empresa." } }
{ "error": { "codigo": "cliente_no_encontrado", "mensaje": "El cliente no existe o no pertenece a esta empresa." } }
{ "error": { "codigo": "correo_invalido", "mensaje": "El formato del correo electrónico no es válido." } }
```

### Usuarios — asignación de sucursales (sin endpoint HTTP en este sprint)

No hay tabla de contrato de API aquí: la ruta `/usuarios/:id` (con el campo de asignación de sucursales incluido en el mismo payload del CRUD) la define y expone [[004-usuarios-roles-alcance]]. Este sprint solo garantiza que el caso de uso `GestionarAccesoSucursalUseCase` lanza `SucursalNoAsignadaError` (mapeado a `{ error: { codigo: "sucursal_no_asignada", ... } }` por quien lo exponga) cuando el usuario requiere sucursal y no tiene ninguna — la traducción HTTP final es responsabilidad de 004.

Todos los errores siguen el envelope de `CLAUDE.md`: `{ error: { codigo, mensaje, detalles? } }`.

---

## Estándares técnicos obligatorios

### Arquitectura hexagonal (backend)

```
domain/          → sin imports de Express, Prisma, ni nada de infraestructura
application/     → sin imports de Express ni @prisma/client; usa solo puertos del domain
infrastructure/  → único lugar donde viven Prisma y Express; implementa los puertos
```

- `GestionarSucursalUseCase` recibe `SucursalRepositoryPort` y `ClienteRepositoryPort` por constructor — nunca instancia Prisma.
- `GestionarAccesoSucursalUseCase` (módulo `auth`) recibe `UsuarioRepositoryPort` por constructor.
- El controlador de `sucursales` solo traduce HTTP ↔ caso de uso; cero lógica de negocio en él (el módulo `usuarios` no tiene controller propio en este sprint, ver nota de alcance).
- `validarCorreo()` y `puedeSeleccionarse()` viven en `domain/sucursal.entity.ts`. `requiereSucursalAsignada()` y `tieneAsignacionValida()` viven en `domain/usuario.entity.ts` (módulo `auth`).

### Aislamiento multiempresa

- El repositorio Prisma de `sucursales` filtra siempre por `empresaId` en cada método (`listarPorCliente`, `obtenerPorId`, `actualizar`, `cambiarEstado`, `obtenerHistoricoCertificaciones`).
- El `empresaId` viene siempre de `req.usuario!.empresaId` (middleware `autenticar`), nunca del body.
- La consulta de histórico (`obtenerHistoricoCertificaciones`) filtra la tabla `inspeccion` por `sucursalId` **y** `empresaId` — doble filtro aunque `sucursalId` ya sea único, por defensa en profundidad (mismo principio que `CLAUDE.md` → "Aislamiento multiempresa").

### Clean Code

- Una función, un propósito. Si un método supera ~30 líneas, extraer funciones auxiliares con nombre descriptivo.
- Nombres en español: `obtenerHistoricoCertificaciones`, `requiereSucursalAsignada`, `actualizarAsignacionSucursales`.
- Sin comentarios que expliquen *qué* hace el código — solo los que explican *por qué* existe una decisión no obvia (ej. por qué `Inspeccion.sucursalId` es nullable en este sprint).
- `pnpm lint` debe pasar en verde.

---

## Notas importantes

- El módulo `sucursales` es nuevo (no existe agente de dominio dedicado en `CLAUDE.md`, igual que `clientes` en 002) — se implementa bajo `agente-backend`/`agente-frontend`, siguiendo el mismo patrón factory que `clientes` e `inspeccion`.
- El módulo `auth` se **extiende**, no se duplica: la asociación Usuario↔Sucursal vive dentro de `apps/api/src/modules/auth/` porque `CLAUDE.md` asigna las tablas `usuario`, `rol`, `permiso` a `agente-auth`.
- `Inspeccion.sucursalId` solo se agrega como columna de modelo de datos en este sprint. Ningún caso de uso de este sprint escribe ese campo — se deja preparado para el sprint futuro de ejecución de inspecciones (RF-08). El "Selector de sucursal al iniciar inspección" (Pantalla 2 de la spec) **no se construye en este sprint**: la spec aclara en "Fuera de alcance" que "la pantalla de ejecución en sí se construye en su propio sprint"; este sprint solo deja lista la columna y la regla de negocio (`puedeSeleccionarse()`), no la UI de selección.
- El rol de "alcance total" exento de la regla de asignación obligatoria se fija como `ROL_ADMIN` (`administrador`), tomando el ejemplo explícito de la spec ("ej. administrador de la empresa cliente que ve todo"). Si en el futuro se define más de un rol con alcance total, ajustar `requiereSucursalAsignada()` — es una función pura y centralizada, fácil de extender.
- `agente-frontend` no toca `apps/api` — si necesita un endpoint nuevo o un cambio de contrato, lo solicita en `memoria/sprint/`.
- Al desactivar un `Cliente`, sus sucursales **no** se desactivan en cascada (regla explícita de la spec) — no implementar ese comportamiento salvo que `agente-arquitecto` lo apruebe explícitamente en una decisión registrada en `memoria/decisiones.md`.
