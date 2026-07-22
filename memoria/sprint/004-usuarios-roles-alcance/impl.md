# Guía de implementación — 004-usuarios-roles-alcance

> Referencia técnica para los agentes. Describe qué construir y dónde, sin escribir el código — el código va en el repositorio, no aquí.
> Complejidad de UI comparable a `002-crud-clientes` (CRUD + tabla + formulario condicional), no al editor visual de `001-crud-formulario`.

---

## Archivos a crear / modificar

### Base de datos (`packages/db`)

```
prisma/
├── schema.prisma                              ← MODIFICAR: Usuario.clienteId + relación Cliente.usuarios
├── migrations/
│   └── YYYYMMDDHHMMSS_add_usuario_cliente_alcance/
│       └── migration.sql                      ← generada por prisma migrate dev
├── seed.ts                                     ← MODIFICAR: upsert de 2 roles nuevos
└── seeds/
    └── usuarios-demo.ts                        ← CREAR: 2 usuarios demo (administrador_cliente, usuario_sucursal)
```

**Cambios en `schema.prisma`:**
```prisma
model Usuario {
  // ...campos existentes (empresaId, authUserId, email, nombre, rolId, passwordHash, activo)...
  clienteId  String? @map("cliente_id")
  // sucursalId String? @map("sucursal_id")   ← YA EXISTE desde sprint 003, no se toca aquí

  cliente  Cliente? @relation(fields: [clienteId], references: [id])
  // sucursal Sucursal? @relation(...)         ← YA EXISTE desde sprint 003

  @@index([empresaId, clienteId])
}

model Cliente {
  // ...campos existentes...
  usuarios Usuario[]
}
```

> No se agrega `CHECK` SQL para forzar "solo un tipo de alcance según el rol": la combinación válida depende del **nombre** del rol (tabla `rol`), no es expresable como constraint de columna simple. Se valida en `application/` del módulo `auth` (`validarAlcancePorRol`).

### Backend — módulo `auth` (`apps/api/src/modules/auth`)

```
domain/
├── usuario.entity.ts              ← MODIFICAR: clienteId/sucursalId + requiereClienteId/requiereSucursalId
│                                     + validarAlcancePorRol + AlcanceUsuario + calcularAlcance
├── usuario.repository.port.ts     ← MODIFICAR: agregar 8 métodos CRUD (ver task.md T-158)
├── rol.repository.port.ts         ← CREAR: puerto de solo lectura obtenerPorId(id)
└── auth.errors.ts                 ← MODIFICAR: + AlcanceInvalidoError, EmailDuplicadoError,
                                      UsuarioNoEncontradoError, SucursalRequeridaError

application/
├── auth.schema.ts                 ← EXISTE (iniciarSesionSchema, sin cambios)
├── usuario.schema.ts               ← CREAR: crearUsuarioSchema + actualizarUsuarioSchema
└── casos-uso/
    ├── iniciar-sesion.usecase.ts   ← EXISTE, sin cambios
    └── gestionar-usuario.usecase.ts ← CREAR: listar/obtenerPorId/crear/actualizar/activar/desactivar

infrastructure/
├── usuario.prisma-repository.ts   ← MODIFICAR: implementar los métodos CRUD nuevos del puerto
├── rol.prisma-repository.ts       ← CREAR: implementa RolRepositoryPort
├── auth.controller.ts             ← MODIFICAR: + handler `meInfo` para GET /auth/me
├── auth.router.ts                 ← MODIFICAR: + ruta GET /me
├── usuario.controller.ts          ← CREAR: 6 handlers CRUD
├── usuarios.router.ts             ← CREAR: monta autenticar + requiereRol(ROL_ADMIN)
├── local-auth.adapter.ts          ← MODIFICAR: incluir clienteId/sucursalId en el JWT
└── supabase-auth.adapter.ts       ← sin cambios

index.ts                           ← MODIFICAR: exponer { router, routerUsuarios }
```

### Middleware transversal (`apps/api/src/middleware`)

```
autenticacion.middleware.ts   ← MODIFICAR: req.usuario incluye clienteId/sucursalId
autorizacion.middleware.ts    ← sin cambios (requiereRol ya acepta cualquier RolSistema)
alcance.middleware.ts          ← CREAR: resolverAlcance(prisma) → adjunta req.alcance
```

`apps/api/src/index.ts` — cambios:
```typescript
import { crearMiddlewareAlcance } from "./middleware/alcance.middleware";
// ...
const resolverAlcance = crearMiddlewareAlcance(prisma);
const moduloAuth = crearModuloAuth(prisma, supabase);
app.use("/auth", moduloAuth.router);
app.use("/usuarios", moduloAuth.routerUsuarios);
```
El middleware `resolverAlcance` se monta dentro de cada router de dominio que lo necesite (`clientes.router.ts`, `sucursales.router.ts`), no globalmente — evita resolver alcance en rutas que no lo usan (ej. `/inspeccion/plantillas`, donde el alcance no aplica de la misma forma).

### Backend — módulos existentes extendidos (`clientes`, `sucursales`, `inspeccion`)

```
apps/api/src/modules/clientes/
├── domain/cliente.repository.port.ts   ← MODIFICAR: + tipo AlcanceConsulta local + parámetro alcance
├── infrastructure/cliente.prisma-repository.ts ← MODIFICAR: aplica alcance al where
├── infrastructure/cliente.controller.ts ← MODIFICAR: construye AlcanceConsulta desde req.alcance
└── infrastructure/clientes.router.ts    ← MODIFICAR: monta resolverAlcance tras autenticar

apps/api/src/modules/sucursales/          ← (asumido existente desde sprint 003)
├── domain/sucursal.repository.port.ts   ← MODIFICAR: mismo patrón que clientes
├── infrastructure/sucursal.prisma-repository.ts ← MODIFICAR
├── infrastructure/sucursal.controller.ts ← MODIFICAR
└── infrastructure/sucursales.router.ts   ← MODIFICAR: monta resolverAlcance

apps/api/src/modules/inspeccion/
└── infrastructure/*.controller.ts        ← MODIFICAR: bloquear escritura (403) para roles externos
```

### Route Handlers proxy (`apps/web`)

```
src/app/api/
├── usuarios/
│   ├── route.ts                         ← CREAR: GET (lista) + POST (crear)
│   └── [...path]/route.ts               ← CREAR: GET/PATCH/POST para :id, :id/activar, :id/desactivar
└── auth/
    └── me/route.ts                      ← CREAR: GET, proxy a /auth/me con cookie doonflow_token
```
Mismo patrón que `apps/web/src/app/api/clientes/` (`route.ts` + `[...path]/route.ts`, cookie `doonflow_token` → header `Authorization: Bearer`).

### Tipos compartidos (`packages/shared`)

```
src/constants/roles.ts   ← MODIFICAR: + ROL_ADMINISTRADOR_CLIENTE, ROL_USUARIO_SUCURSAL
src/types/usuario.ts      ← MODIFICAR: UsuarioAutenticado + clienteId/sucursalId
                             + CREAR: Usuario, UsuarioConAlcance
```

**Tipos a agregar en `types/usuario.ts`:**
```typescript
export interface Usuario {
  id: string;
  empresaId: string;
  email: string;
  nombre: string;
  rolId: string;
  rolNombre: RolSistema;
  clienteId?: string | null;
  sucursalId?: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface UsuarioConAlcance extends Usuario {
  clienteNombre?: string | null;
  sucursalNombre?: string | null;
  sucursalesAdicionales: { id: string; nombre: string }[];
}
```

### Frontend (`apps/web`)

```
src/app/(dashboard)/
├── mantenimientos/
│   ├── page.tsx                          ← MODIFICAR: tarjeta "Usuarios"
│   └── usuarios/
│       ├── page.tsx                      ← CREAR: página lista
│       ├── nuevo/page.tsx                ← CREAR: página agregar
│       ├── [id]/editar/page.tsx          ← CREAR: página modificar
│       ├── _servicios/usuario.servicio.ts ← CREAR
│       ├── _hooks/
│       │   ├── usar-usuarios.ts           ← CREAR
│       │   └── usar-formulario-usuario.ts ← CREAR
│       └── _components/
│           ├── tabla-usuarios.tsx         ← CREAR
│           └── formulario-usuario.tsx     ← CREAR
├── mi-empresa/
│   └── page.tsx                          ← CREAR: redirige a detalle de cliente propio (soloLectura)
├── mi-sucursal/
│   └── page.tsx                          ← CREAR: histórico acotado, con selector si aplica
└── _components/
    └── sidebar.tsx                       ← MODIFICAR: subitem "Usuarios"

src/lib/
└── sesion.servicio.ts                    ← CREAR: obtenerSesionActual() → { usuario, alcance }

middleware.ts                             ← MODIFICAR: guards de /mantenimientos/usuarios,
                                              /mi-empresa, /mi-sucursal por rol
```

---

## Diseño de UI

### Lista de usuarios (`/mantenimientos/usuarios`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Mantenimientos > Usuarios                                       [Breadcrumb] │
├──────────────────────────────────────────────────────────────────────────────┤
│ Usuarios                                            [+ Agregar usuario]      │
│ Cuentas de acceso y su alcance de visibilidad                                │
├──────────────────────────────────────────────────────────────────────────────┤
│  NOMBRE          CORREO             ROL                    ALCANCE       ESTADO  ACCIÓN│
│  ────────────────────────────────────────────────────────────────────────────│
│  Ana Solano      ana@doonflow.demo  Administrador general   Todos        ● Activo [Modificar]│
│  Carlos Mora     carlos@dist.com    Administrador de cliente Dist. Sur   ● Activo [Modificar]│
│  Lucía Vindas    lucia@dist.com     Usuario de sucursal      Planta Central y 1 más ● Activo [Modificar]│
│  ────────────────────────────────────────────────────────────────────────────│
└──────────────────────────────────────────────────────────────────────────────┘
```

- El botón **"+ Agregar usuario"** siempre visible en la esquina superior derecha.
- Columna "Alcance" es texto derivado (no editable desde la tabla).
- Mismo patrón visual que `TablaClientes` de 002: `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card`, skeleton de 5 filas, estado vacío con CTA.

### Formulario agregar / modificar usuario

```
┌────────────────────────────────────────────────────────────┐
│ Mantenimientos > Usuarios > Nuevo usuario      [Breadcrumb] │
├────────────────────────────────────────────────────────────┤
│ Nuevo usuario                                                │
│ ─────────────────────────────────────────────────────────   │
│  Nombre *              [__________________________________] │
│  Correo *              [__________________________________] │
│  Contraseña *           [__________________________________] │  ← solo en creación
│  Rol *                  [Administrador general           ▼]  │
│                                                                │
│  ── (si Rol = Administrador de cliente) ──────────────────── │
│  Cliente *               [Seleccionar cliente...          ▼]  │
│                                                                │
│  ── (si Rol = Usuario de sucursal) ───────────────────────── │
│  Cliente (para filtrar)  [Seleccionar cliente...          ▼]  │
│  Sucursal principal *    [Seleccionar sucursal...          ▼]  │
│  Sucursales adicionales  [ ] Sucursal Norte                   │
│                           [ ] Sucursal Sur                     │
│  ─────────────────────────────────────────────────────────   │
│  [   Guardar   ]                       [   Cancelar   ]      │
└────────────────────────────────────────────────────────────┘
```

- Igual que `FormularioCliente` de 002: contenedor `rounded-[10px] bg-white shadow-1 ...`, componente interno `Campo({label, requerido, error, children})`, helper `inputCls(conError)`; se agrega `selectCls(conError)` análogo para los `<select>`.
- El bloque condicional se muestra/oculta con el mismo patrón que `PanelEdicionNodo` de 001 muestra/oculta campos de PREGUNTA según `tipo` — aquí según `rolId` seleccionado (resuelto a nombre de rol en el propio formulario, recibido por props desde la página).
- En modo **editar**, no se renderiza el campo Contraseña; se agrega nota de texto secundario bajo el Rol: "El restablecimiento de contraseña se gestiona en un sprint futuro."

### Vista "Mi empresa" (`/mi-empresa`)

Reutiliza la pantalla de detalle de cliente de 003 (sección Sucursales con puntaje vigente + histórico + observaciones), en modo `soloLectura=1`:

```
┌────────────────────────────────────────────────────────────────────┐
│ Distribuidora Sur S.A.                              ● Activo        │  ← sin botón "Modificar"
├────────────────────────────────────────────────────────────────────┤
│ Sucursales                                                          │  ← sin botón "Agregar sucursal"
│  NOMBRE            DIRECCIÓN        PUNTAJE VIGENTE   ESTADO  ACCIÓN│
│  Planta Central     San José         92 / 100 ✓       Activo  [Ver historial]│
│  Sucursal Norte      Heredia          —                Activo  [Ver historial]│
├────────────────────────────────────────────────────────────────────┤
│ Historial de inspecciones (por sucursal, al entrar a "Ver historial")│
│ Observaciones de mejora continua (campo Inspeccion.observaciones)    │
└────────────────────────────────────────────────────────────────────┘
```

### Vista "Mi sucursal" (`/mi-sucursal`)

```
┌────────────────────────────────────────────────────────────────────┐
│ Mi sucursal: [Planta Central ▼]      ← selector SOLO si > 1 sucursal│
├────────────────────────────────────────────────────────────────────┤
│ Certificación vigente: 92 / 100  ·  Excelente                       │
├────────────────────────────────────────────────────────────────────┤
│ Historial de inspecciones                                            │
│  FECHA        PLANTILLA               PUNTAJE     CLASIFICACIÓN     │
│  2026-05-10   Ministerio de Salud     92 / 100    Excelente         │
│  2026-02-03   Ministerio de Salud     78 / 100    Aceptable         │
└────────────────────────────────────────────────────────────────────┘
```

Reutiliza el componente de histórico por sucursal de 003 (Pantalla 3), sin modificarlo — solo se le pasa `sucursalId` acotado por el alcance del usuario.

---

## Contrato de API

### Módulo `usuarios` (nuevo)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/usuarios` | Lista todos los usuarios de la empresa (solo `administrador`) |
| POST | `/usuarios` | Crear usuario |
| GET | `/usuarios/:id` | Obtener usuario por id, con alcance resuelto |
| PATCH | `/usuarios/:id` | Actualizar campos (todos opcionales) |
| POST | `/usuarios/:id/activar` | Activar usuario |
| POST | `/usuarios/:id/desactivar` | Desactivar usuario |

**Request body — crear:**
```json
{
  "nombre": "Carlos Mora",
  "email": "carlos@dist.com",
  "password": "Cliente2026!",
  "rolId": "uuid-rol-administrador-cliente",
  "clienteId": "uuid-cliente-dist-sur",
  "sucursalId": null,
  "sucursalesAdicionalesIds": []
}
```

**Response exitosa:**
```json
{
  "data": {
    "id": "uuid",
    "empresaId": "uuid",
    "email": "carlos@dist.com",
    "nombre": "Carlos Mora",
    "rolId": "uuid-rol-administrador-cliente",
    "rolNombre": "administrador_cliente",
    "clienteId": "uuid-cliente-dist-sur",
    "clienteNombre": "Distribuidora Sur S.A.",
    "sucursalId": null,
    "sucursalNombre": null,
    "sucursalesAdicionales": [],
    "activo": true,
    "creadoEn": "2026-07-16T00:00:00.000Z",
    "actualizadoEn": "2026-07-16T00:00:00.000Z"
  }
}
```

**Errores:**
```json
{ "error": { "codigo": "usuario_no_encontrado", "mensaje": "El usuario no existe o no pertenece a esta empresa." } }
{ "error": { "codigo": "email_duplicado", "mensaje": "Ya existe un usuario con ese correo en esta empresa." } }
{ "error": { "codigo": "alcance_invalido", "mensaje": "El alcance seleccionado no corresponde al rol elegido." } }
{ "error": { "codigo": "sucursal_requerida", "mensaje": "Un usuario de sucursal necesita una sucursal principal o al menos una sucursal adicional." } }
```

### `GET /auth/me` (nuevo)

```json
{
  "data": {
    "usuario": { "id": "uuid", "email": "...", "nombre": "...", "rol": "usuario_sucursal" },
    "alcance": {
      "tipo": "SUCURSAL",
      "sucursales": [
        { "id": "uuid-1", "nombre": "Planta Central" },
        { "id": "uuid-2", "nombre": "Sucursal Norte" }
      ]
    }
  }
}
```
Para `tipo: "TOTAL"` no se incluye `cliente` ni `sucursales`. Para `tipo: "CLIENTE"` se incluye `cliente: { id, empresa }`.

### Endpoints existentes con alcance agregado (sin cambio de forma, solo de datos retornados)

| Método | Ruta | Cambio |
|--------|------|--------|
| GET | `/clientes` | Filtra según `req.alcance` (antes: siempre todos los de la empresa) |
| GET | `/clientes/:id` | 404 si el cliente está fuera del alcance del usuario |
| GET | `/sucursales?clienteId=` | Filtra según `req.alcance`, ignora `clienteId` si el rol es `usuario_sucursal` y no coincide |
| GET/POST | `/inspeccion/...` (ejecución) | 403 `rol_no_autorizado` si `rol` es `administrador_cliente`/`usuario_sucursal` |

Todos los errores siguen el envelope: `{ error: { codigo, mensaje, detalles? } }`.

---

## Tokens de diseño DoonFlow (reutilizados, sin tokens nuevos)

| Elemento | Clases Tailwind |
|---|---|
| Contenedor de tabla y formulario | `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` |
| Badge Activo | `bg-green-light/[0.08] text-green dark:bg-green/10` + dot `bg-green` |
| Badge Inactivo | `bg-gray-2 text-dark-4 dark:bg-dark-3 dark:text-dark-6` + dot `bg-dark-4` |
| Botón Modificar | `text-sm font-medium text-primary hover:underline` |
| Botón Agregar usuario | `inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-opacity-90` |
| Input / Select campo | `w-full rounded-lg border px-3 py-2.5 text-sm text-dark outline-none transition-colors dark:bg-dark-2 dark:text-white`, borde `border-red focus:border-red` si hay error, si no `border-stroke focus:border-primary dark:border-dark-3` |
| Skeleton | `h-4 animate-pulse rounded bg-gray-2 dark:bg-dark-3` |
| Separador de sección | `text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6` |
| Nota secundaria (restablecer contraseña) | `text-body-xs text-dark-4 dark:text-dark-6` |

No se requiere ningún componente nuevo en `packages/ui`: el formulario usa el mismo patrón inline (`Campo` + `inputCls`) que `formulario-cliente.tsx`, extendido con un `selectCls` equivalente y checkboxes nativos para "Sucursales adicionales".

---

## Arquitectura hexagonal — módulo `auth` extendido

```
domain/        → UsuarioConRol + reglas de alcance (requiereClienteId, requiereSucursalId,
                  validarAlcancePorRol, calcularAlcance) + errores + puertos (Usuario, Rol)
application/   → GestionarUsuarioUseCase + IniciarSesionUseCase + schemas Zod — sin Express ni Prisma
infrastructure/→ UsuarioPrismaRepository + RolPrismaRepository + UsuarioController +
                  AuthController (+ /me) + routers — único lugar con Prisma/Express/bcrypt
```

- El controller de usuarios extrae `empresaId` de `req.usuario!.empresaId` (igual que `clientes`).
- `resolverAlcance` vive en `middleware/`, no en `domain/auth`: consume `calcularAlcance` (dominio) pero la resolución de la consulta HTTP (leer `req.usuario`, adjuntar `req.alcance`) es infraestructura transversal, igual que `autenticacion.middleware.ts`.
- Los módulos `clientes`/`sucursales` **no importan nada de `auth`**: reciben `req.alcance` ya resuelto y lo traducen a su propio tipo `AlcanceConsulta` local en el controller (regla de dependencia: cada módulo define sus propios tipos de entrada, no depende del dominio de otro módulo).
- Mismo patrón factory que `clientes`/`inspeccion`:
  ```typescript
  export function crearModuloAuth(prisma: PrismaClient, supabase: SupabaseClient | null) {
    const usuarioRepository = new UsuarioPrismaRepository(prisma);
    const rolRepository = new RolPrismaRepository(prisma);
    // ...proveedorAuth (Local o Supabase) igual que hoy...
    const iniciarSesionUseCase = new IniciarSesionUseCase(proveedorAuth, usuarioRepository);
    const gestionarUsuarioUseCase = new GestionarUsuarioUseCase(usuarioRepository, rolRepository);
    const authController = new AuthController(iniciarSesionUseCase, usuarioRepository); // para /me
    const usuarioController = new UsuarioController(gestionarUsuarioUseCase);
    return {
      router: crearAuthRouter(authController),
      routerUsuarios: crearUsuariosRouter(usuarioController, autenticar, requiereRol),
    };
  }
  ```

---

## Notas importantes

- `agente-frontend` no toca `apps/api` — si necesita un cambio de contrato (ej. otro campo en `GET /auth/me`), lo solicita en `memoria/sprint/` a `agente-auth`.
- `agente-backend` solo extiende `clientes`/`sucursales` con el parámetro `alcance`; no cambia ningún endpoint existente de forma incompatible (el comportamiento para `administrador` es idéntico al de antes de este sprint).
- El `empresaId` sigue viniendo siempre del JWT — el alcance por `Cliente`/`Sucursal` es un nivel adicional **dentro** de esa empresa tenant, nunca la reemplaza (regla 9 del spec).
- La gestión de usuarios (`/mantenimientos/usuarios`) queda restringida al rol `administrador` en este sprint — si más adelante se decide que un `administrador_cliente` pueda crear usuarios de su propia empresa, es una ampliación de alcance a decidir con `agente-arquitecto`, no una suposición de esta implementación.
- El reseteo de contraseña (self-service o por administrador) queda explícitamente fuera de este sprint (ver spec → "Fuera de alcance").
