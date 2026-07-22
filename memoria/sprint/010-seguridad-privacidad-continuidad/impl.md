# Guía de implementación — 010-seguridad-privacidad-continuidad

> Referencia técnica para los agentes. Describe qué construir y dónde, sin escribir el código — el código va en el repositorio, no aquí.
>
> A diferencia de sprints anteriores, este sprint es mayormente **backend/infraestructura** (RNF transversales). Se dedica más espacio al diseño técnico (middleware, job de purgado, estrategia de paginación) y menos a mockups visuales — las 2 pantallas nuevas son deliberadamente simples (ver spec, sección "Pantallas").

## Desviaciones respecto a este documento (registradas durante la implementación, 2026-07-21)

1. **`JWT_EXPIRES_IN` reutilizado en vez de `JWT_EXPIRATION_MINUTES`.** El spec/task.md pedían una variable nueva `JWT_EXPIRATION_MINUTES` con default 30 min. Al revisar el código real, `LocalAuthAdapter` ya leía `JWT_EXPIRES_IN` (formato `ms`, ej. `"8h"`) desde el sprint 004 — la expiración configurable ya existía, solo no estaba documentada. Se documentó `JWT_EXPIRES_IN` en `.env.example` y se mantuvo el default `8h` (no se bajó a 30 min, para no invalidar sesiones activas sin aviso). Ver `memoria/decisiones.md`, entrada 2026-07-21.
2. **Rutas reales de las 2 pantallas nuevas: `/mantenimientos/auditoria` y `/mantenimientos/retencion`, no `/configuracion/auditoria`/`/configuracion/retencion`.** La app real no tiene una sección "Configuración" separada en el sidebar — el patrón establecido desde 007 agrega estas pantallas como sub-ítems de "Mantenimientos" (junto a "Roles y permisos"). Se siguió ese patrón existente en vez de crear una sección nueva del sidebar.
3. **Redirect de sesión expirada a `/auth/login`, no `/auth/sign-in`.** La ruta de login de esta app siempre fue `/auth/login` (nunca existió `/auth/sign-in`) — se corrigió el nombre de ruta al implementar, el resto del comportamiento (mensaje visible, reutiliza el layout existente) sigue lo pedido.
4. **`AvisoPrivacidad` montado bajo `/privacidad/:entidadTipo/:entidadId` (GET/POST), no anidado bajo `/clientes/:id/aviso-privacidad` y `/sucursales/:id/aviso-privacidad`.** Anidar el router de `privacidad` dentro de los routers de `clientes`/`sucursales` habría cruzado la frontera de esos módulos (inyectar el controller de `privacidad` en su composición). Se optó por un router genérico propio con `entidadTipo` como segmento de ruta — mismo resultado funcional, un solo router en vez de duplicar la definición de rutas en dos módulos. **Importante**: inicialmente este router genérico no validaba que `entidadId` perteneciera a la empresa del usuario autenticado (bug real, corregido en la misma sesión — `GestionarAvisoPrivacidadUseCase` ahora depende de `ClienteRepositoryPort`/`SucursalRepositoryPort` para verificar pertenencia antes de registrar/listar, lanzando `EntidadPrivacidadNoEncontradaError` → 404).
5. **`sp_retencion_purgar_datos(p_empresa_id TEXT)`, no `UUID`.** Todos los `id` del schema son `TEXT` (`String @id @default(uuid())` de Prisma) — no hay ninguna columna `UUID` nativa de Postgres en esta base, así que el parámetro del SP se tipó consistente con el resto del schema real, no con el spec (que asumía `UUID`).
6. **`PDF_CERTIFICACION` sin efecto en el SP de purgado.** La columna `pdf_url` no existe todavía en `inspeccion` porque 005-certificacion-plan-cumplimiento (firma/PDF) sigue pausado. El SP solo actúa sobre `EVIDENCIA` y `DATO_PERSONAL_CONTACTO`; la política `PDF_CERTIFICACION` queda sembrada (para cuando 005 se retome) pero no purga nada todavía.
7. **`DATO_PERSONAL_CONTACTO`: `ELIMINAR` se trata igual que `ANONIMIZAR` (nunca se hace `DELETE` de `cliente`/`sucursal`), y solo aplica a registros `activo = false`.** Un `DELETE` en cascada arrastraría sucursales/usuarios/certificaciones asociadas — demasiado destructivo para un job automático sin confirmación humana. Restringir a `activo = false` evita anonimizar el contacto de un cliente/sucursal todavía en uso activo por una política de retención mal configurada.
8. **Integración de auditoría (T-429) parcial, no las 6 acciones listadas en el spec.** Se integró `LOGIN`/`LOGIN_FALLIDO` (`iniciar-sesion.usecase.ts`), `PERMISO_MODIFICADO` (`gestionar-matriz-permisos.usecase.ts`) y `USUARIO_DESACTIVADO` (`gestionar-usuario.usecase.ts`) — verificados por curl en esta sesión. **No integrado**: `CLIENTE_DESACTIVADO`/`SUCURSAL_DESACTIVADO` (mismo patrón que `USUARIO_DESACTIVADO`, pendiente de aplicar en `gestionar-cliente.usecase.ts`/`gestionar-sucursal.usecase.ts`). `CERTIFICACION_FIRMADA`/`PLAN_CERRADO` siguen bloqueados por la pausa de 005/013, como ya estaba documentado.
9. **Sucursales usa el endpoint paginado sin exponer `Paginador` en la UI.** Decisión de alcance: las sucursales cuelgan de un cliente (lista naturalmente acotada), a diferencia de Clientes/Certificaciones que sí motivan HU-3 ("listados con muchos registros"). El servicio (`sucursal.servicio.ts`) pide `porPagina=200` al backend paginado real, pero no se construyó una segunda instancia de `Paginador` para una lista que rara vez supera unas pocas decenas de filas.

---

## Archivos a crear / completar

### Base de datos (`packages/db`)

```
prisma/
├── schema.prisma                                    ← MODIFICAR: agregar models RegistroAuditoria,
│                                                        PoliticaRetencion, AvisoPrivacidad
├── migrations/
│   ├── YYYYMMDDHHMMSS_add_registro_auditoria/
│   ├── YYYYMMDDHHMMSS_add_politica_retencion_aviso_privacidad/
│   └── YYYYMMDDHHMMSS_add_indices_paginacion_listados/
└── seeds/
    └── politica-retencion-demo.ts                   ← CREAR

sql/procedimientos/
└── sp_retencion_purgar_datos.sql                    ← CREAR
```

**Models Prisma a agregar:**

```prisma
model RegistroAuditoria {
  id            String   @id @default(uuid())
  empresaId     String   @map("empresa_id")
  usuarioId     String   @map("usuario_id")
  accion        String   @db.VarChar(50)
  entidadTipo   String   @map("entidad_tipo") @db.VarChar(50)
  entidadId     String   @map("entidad_id")
  valorAntes    Json?    @map("valor_antes")
  valorDespues  Json?    @map("valor_despues")
  ip            String?  @db.VarChar(45)
  creadoEn      DateTime @default(now()) @map("creado_en")

  usuario Usuario @relation(fields: [usuarioId], references: [id])

  @@index([empresaId, accion, creadoEn])
  @@index([usuarioId])
  @@index([entidadTipo, entidadId])
  @@map("registro_auditoria")
}
// Nota: sin @updatedAt y sin onDelete: Cascade hacia esta tabla desde ningún lado —
// es append-only por diseño (regla de negocio 1 del spec).

model PoliticaRetencion {
  id              String   @id @default(uuid())
  empresaId       String   @map("empresa_id")
  tipoDato        String   @map("tipo_dato") @db.VarChar(30)   // EVIDENCIA | PDF_CERTIFICACION | DATO_PERSONAL_CONTACTO
  mesesRetencion  Int      @map("meses_retencion")
  accionAlVencer  String   @map("accion_al_vencer") @db.VarChar(20) // ANONIMIZAR | ELIMINAR
  actualizadoEn   DateTime @updatedAt @map("actualizado_en")

  @@unique([empresaId, tipoDato])
  @@map("politica_retencion")
}

model AvisoPrivacidad {
  id               String   @id @default(uuid())
  entidadTipo      String   @map("entidad_tipo") @db.VarChar(20) // CLIENTE | SUCURSAL
  entidadId        String   @map("entidad_id")
  baseLegal        String   @map("base_legal")
  registradoPorId  String   @map("registrado_por_id")
  empresaId        String   @map("empresa_id")
  creadoEn         DateTime @default(now()) @map("creado_en")

  registradoPor Usuario @relation(fields: [registradoPorId], references: [id])

  @@index([entidadTipo, entidadId])
  @@map("aviso_privacidad")
}
```

### Backend (`apps/api`)

```
src/modules/auditoria/
├── domain/
│   ├── registro-auditoria.entity.ts
│   ├── registro-auditoria.repository.port.ts   ← SOLO registrar() y listar()
│   └── registro-auditoria.errors.ts
├── application/
│   └── casos-uso/
│       ├── registrar-auditoria.usecase.ts
│       └── listar-auditoria.usecase.ts
├── infrastructure/
│   ├── registro-auditoria.prisma-repository.ts
│   ├── auditoria.controller.ts
│   └── auditoria.router.ts
└── index.ts                                     ← crearModuloAuditoria(prisma, autenticar)

src/modules/retencion/
├── domain/
│   ├── politica-retencion.entity.ts
│   └── politica-retencion.repository.port.ts
├── application/
│   └── casos-uso/gestionar-politica-retencion.usecase.ts
├── infrastructure/
│   ├── politica-retencion.prisma-repository.ts
│   ├── politica-retencion.controller.ts
│   ├── politica-retencion.router.ts
│   └── job-purgar-retencion.job.ts              ← invoca sp_retencion_purgar_datos por empresa
└── index.ts

src/modules/privacidad/
├── domain/
│   ├── aviso-privacidad.entity.ts
│   └── aviso-privacidad.repository.port.ts
├── application/
│   └── casos-uso/gestionar-aviso-privacidad.usecase.ts
├── infrastructure/
│   ├── aviso-privacidad.prisma-repository.ts
│   ├── aviso-privacidad.controller.ts
│   └── aviso-privacidad.router.ts
└── index.ts

src/shared/auditoria/
└── registrar-evento-auditoria.ts                ← helper transversal para otros módulos

src/middleware/
└── autenticar.middleware.ts                     ← MODIFICAR: chequeo de exp del JWT

src/modules/auth/domain/
└── politica-password.entity.ts                  ← CREAR (dentro de `modules/auth/`, no un módulo `usuarios` aparte — el CRUD de usuarios de [[004-usuarios-roles-alcance]] vive en `modules/auth/`, mismo módulo de login)
src/modules/auth/application/casos-uso/
└── cambiar-password.usecase.ts                  ← CREAR

src/modules/clientes/infrastructure/cliente.prisma-repository.ts        ← MODIFICAR (paginación)
src/modules/sucursales/infrastructure/sucursal.prisma-repository.ts     ← MODIFICAR (paginación)
src/modules/inspeccion/infrastructure/certificacion.prisma-repository.ts ← MODIFICAR (paginación; vive en `modules/inspeccion/`, no en `modules/certificacion/`)
```

### Route Handlers proxy (Next.js)

```
apps/web/src/app/api/
├── auditoria/route.ts                           ← GET
├── retencion/politicas/
│   ├── route.ts                                 ← GET
│   └── [tipoDato]/route.ts                      ← PUT
├── clientes/[id]/aviso-privacidad/route.ts       ← POST + GET
├── sucursales/[id]/aviso-privacidad/route.ts     ← POST + GET
├── usuarios/[id]/cambiar-password/route.ts       ← POST
├── clientes/route.ts                            ← MODIFICAR: reenviar pagina/porPagina
├── sucursales/route.ts                          ← MODIFICAR: reenviar pagina/porPagina
└── certificaciones/route.ts                     ← MODIFICAR: reenviar pagina/porPagina
```

### Frontend (`apps/web`)

```
src/app/(dashboard)/configuracion/
├── auditoria/
│   ├── page.tsx
│   ├── _servicios/auditoria.servicio.ts
│   ├── _hooks/usar-auditoria.ts
│   └── _components/tabla-auditoria.tsx
└── retencion/
    ├── page.tsx
    ├── _servicios/retencion.servicio.ts
    ├── _hooks/usar-politica-retencion.ts
    └── _components/formulario-retencion.tsx

packages/ui/src/
└── paginador.tsx                                ← CREAR

packages/ui/src/__tests__/
└── paginador.test.tsx                           ← CREAR
```

### Documentación operativa (`agente-produccion`)

```
packages/db/produccion/
└── politica-backup.md                           ← CREAR (frecuencia, retención, RPO/RTO, prueba de restauración)
```

---

## Diseño técnico — Middleware de expiración de sesión

`autenticar.middleware.ts` ya existe (verifica firma del JWT y adjunta `req.usuario`). Este sprint añade un segundo chequeo **después** de validar la firma:

```
1. Verificar firma del JWT (ya existe) → si falla: 401 { codigo: "no_autenticado" }
2. Leer claim `exp` (segundos, estándar JWT) → si Date.now() > exp * 1000:
      401 { codigo: "sesion_expirada", mensaje: "Tu sesión expiró, inicia sesión nuevamente." }
3. Si todo válido → adjuntar req.usuario y continuar
```

- `JWT_EXPIRATION_MINUTES` (env, default `30`) se aplica al **emitir** el token (login), no en este middleware — el middleware solo lee el `exp` ya embebido.
- No hay renovación silenciosa: no existe endpoint `/auth/refresh` en este sprint. Si se requiere refresh token, es una decisión posterior de `agente-auth` (ver "Decisiones pendientes" del spec) — este sprint solo implementa expiración dura + re-login.
- El frontend (`apps/web/middleware.ts` o el interceptor de `_servicios/`) distingue `sesion_expirada` de `no_autenticado` para mostrar un mensaje más específico en el primer caso, pero ambos terminan en el mismo destino: `/auth/sign-in`.

---

## Diseño técnico — Política de contraseña

`validarPoliticaPassword(password: string): string | null` en `domain/politica-password.entity.ts` (módulo `usuarios`), sin dependencias externas:

```
Reglas (mínimo viable, spec no exige más):
  - longitud >= 8
  - al menos una letra mayúscula (/[A-Z]/)
  - al menos un dígito (/[0-9]/)

Retorna null si cumple, o el primer mensaje de error que falle
(ej. "La contraseña debe tener al menos 8 caracteres.").
```

Puntos de invocación obligatorios (backend, nunca solo frontend):
- `crear-usuario.usecase.ts` (creación de usuario nuevo, módulo de sprint 004).
- `cambiar-password.usecase.ts` (nuevo, este sprint) — usado por `POST /usuarios/:id/cambiar-password`.

En producción con Supabase Auth, la contraseña real la gestiona Supabase; esta validación aplica igual como capa adicional del lado de DoonFlow antes de delegar a Supabase (defensa en profundidad, mismo criterio que el aislamiento multiempresa de `CLAUDE.md`) y es la única vía en modo desarrollo local (`Usuario.passwordHash`).

---

## Diseño técnico — `RegistroAuditoria` (append-only)

El puerto es deliberadamente angosto para que la regla de negocio 1 del spec ("ningún registro se edita ni se borra") quede reforzada por el tipo, no solo por convención:

```typescript
interface RegistroAuditoriaRepositoryPort {
  registrar(datos: NuevoRegistroAuditoria): Promise<RegistroAuditoria>;
  listar(
    empresaId: string,
    filtros: FiltrosAuditoria,
    paginacion: { pagina: number; porPagina: number }
  ): Promise<{ items: RegistroAuditoria[]; total: number }>;
}
```

No hay `actualizar()` ni `eliminar()` en el puerto — un desarrollador que intente agregarlos rompe la interfaz explícitamente, en vez de simplemente "no llamarlos por convención".

### Helper transversal `registrarEventoAuditoria()`

`src/shared/auditoria/registrar-evento-auditoria.ts` expone una función simple para que **otros módulos** (auth, certificación, permisos) registren un evento sin instanciar el repositorio de auditoría cada vez:

```
registrarEventoAuditoria({
  prisma, empresaId, usuarioId, accion, entidadTipo, entidadId,
  valorAntes?, valorDespues?, ip?
}): Promise<void>
```

Internamente construye un `RegistrarAuditoriaUseCase` con el repositorio Prisma y llama `registrar()`. Vive en `src/shared/` (propiedad de `agente-backend`, igual que el resto de infraestructura común de la API — ver `CLAUDE.md` → agentes de capa técnica) porque lo consumen múltiples módulos de dominio distintos.

**Puntos de integración a agregar en módulos ya existentes** (este sprint solo agrega la llamada; no reescribe esos casos de uso):

| Acción (`RegistroAuditoria.accion`) | Módulo que la dispara | Punto de integración |
|---|---|---|
| `LOGIN` / `LOGIN_FALLIDO` | `auth` | Caso de uso de login, tras validar credenciales |
| `CERTIFICACION_FIRMADA` | [[005-certificacion-plan-cumplimiento]] | Caso de uso de firma, tras cambiar `estado` a `FIRMADA` — **⏸️ bloqueado, 005 pausado** |
| `PLAN_CERRADO` | [[013-hallazgos-plan-cumplimiento]] | Caso de uso de cierre de `PlanCumplimiento` (entidad movida de 005 a 013 al dividir el sprint por tamaño) — **⏸️ bloqueado, depende de 005** |
| `PERMISO_MODIFICADO` | [[007-gobernanza-permisos-aprobacion]] | Caso de uso que guarda cambios de la matriz Rol × Permiso |
| `USUARIO_DESACTIVADO` / `CLIENTE_DESACTIVADO` / `SUCURSAL_DESACTIVADO` | módulos respectivos | Caso de uso `desactivar()` de cada uno |

---

## Diseño técnico — Política de retención y purgado

### Configuración (`PoliticaRetencion`)

CRUD mínimo (`GET`/`PUT`) sobre 3 filas fijas por empresa — no se crean tipos de dato nuevos desde la UI (igual criterio que el catálogo de `Permiso` en [[007-gobernanza-permisos-aprobacion]], que tampoco se edita desde la pantalla, solo se marca/desmarca).

### Job de purgado

`job-purgar-retencion.job.ts` corre diariamente (cron dentro del proceso de `apps/api`, ej. librería `node-cron` — decisión técnica de `agente-backend`; alternativa: job separado/scheduled function del proveedor de hosting, a definir junto con `agente-produccion` cuando se elija el proveedor de `apps/api`, ver `CLAUDE.md` → Despliegue):

```
Para cada Empresa activa:
  1. Ejecutar sp_retencion_purgar_datos(empresaId) vía $queryRaw
  2. El SP retorna filas: { tabla, id, accionAplicada }
  3. Por cada fila: registrarEventoAuditoria({
       accion: accionAplicada === 'ANONIMIZAR' ? 'RETENCION_ANONIMIZADO' : 'RETENCION_ELIMINADO',
       entidadTipo: tabla, entidadId: id,
       valorDespues: { camposAfectados: [...] }   ← nunca el valor PII real cuando se anonimiza
     })
```

### Stored procedure `sp_retencion_purgar_datos`

Vive en `packages/db/sql/procedimientos/` (convención de `CLAUDE.md` → "Procedimientos almacenados"), porque es lógica crítica que debe ser atómica por fila/lote y no repetirse como query suelta en el repositorio:

```sql
CREATE OR REPLACE FUNCTION sp_retencion_purgar_datos(p_empresa_id UUID)
RETURNS TABLE(tabla TEXT, id UUID, accion_aplicada TEXT) AS $$
-- Pseudocódigo de la lógica, el SQL real se escribe al implementar:
--   1. Leer politica_retencion WHERE empresa_id = p_empresa_id
--   2. Para tipoDato = 'EVIDENCIA':
--        seleccionar inspeccion_evidencia con creado_en < now() - meses_retencion
--        si accion_al_vencer = 'ELIMINAR' → DELETE de la fila (y el archivo en Storage
--          se limpia desde la capa de aplicación, no desde SQL)
--        si accion_al_vencer = 'ANONIMIZAR' → no aplica a evidencia binaria; tratar como ELIMINAR
--          (una foto no se "anonimiza", se elimina — documentar esta excepción en el propio SP)
--   3. Para tipoDato = 'PDF_CERTIFICACION':
--        seleccionar inspeccion WHERE firmado_en < now() - meses_retencion AND pdf_url IS NOT NULL
--        limpiar pdf_url (el archivo se borra de Storage desde la capa de aplicación)
--   4. Para tipoDato = 'DATO_PERSONAL_CONTACTO':
--        seleccionar cliente/sucursal WHERE creado_en < now() - meses_retencion
--        si ANONIMIZAR → UPDATE reemplazando correo1/2/3, direccion, nombre_responsable
--          por valores anonimizados (no se borra la fila, mantiene integridad referencial
--          con sucursal/certificacion)
--        si ELIMINAR → no aplica mientras existan sucursales/certificaciones asociadas
--          (violaría integridad referencial); en ese caso el SP retorna la fila igual
--          marcada como 'ANONIMIZAR' con una nota — decisión técnica a confirmar con
--          agente-basededatos antes de implementar el borrado físico real
--   5. Retornar todas las filas afectadas para que la capa de aplicación audite
$$ LANGUAGE plpgsql;
```

> Nota de diseño propia (no está en el spec, que deja "el proceso de purgado" sin detallar el mecanismo exacto): se optó por SP + job en vez de solo query desde TypeScript porque el purgado toca varias tablas con lógica condicional por política — encaja con el criterio de `CLAUDE.md` de usar stored procedures para "validaciones que deben ser atómicas con la escritura". El job en `infrastructure/` solo orquesta (una empresa a la vez, loguea resultado) y nunca decide qué se borra — esa decisión vive en el SP + la tabla `politica_retencion`, no hardcodeada en TypeScript.

---

## Diseño técnico — Paginación server-side

### Contrato uniforme (ya definido en `CLAUDE.md` → "Formato de respuesta de la API", este sprint lo **activa** en los repos que aún no lo aplicaban)

```
Query params: ?pagina=1&porPagina=20&<filtros propios del recurso>
Response: { data: T[], meta: { pagina: number, porPagina: number, total: number } }
```

### Patrón de repositorio (aplicar igual en `cliente`, `sucursal`, `certificacion`)

```
listar(empresaId, filtros, paginacion):
  where = construirWhere(empresaId, filtros)   ← incluye SIEMPRE el filtro de alcance
                                                   (clienteId/sucursalId) resuelto ANTES de paginar
  [items, total] = await Promise.all([
    prisma.<modelo>.findMany({ where, skip: (pagina-1)*porPagina, take: porPagina, orderBy }),
    prisma.<modelo>.count({ where })
  ])
  return { items, total }
```

- El `where` de alcance ([[004-usuarios-roles-alcance]]) se construye una sola vez y se reutiliza tanto en `findMany` como en `count` — evita el error de "paginar todo y filtrar después" que la regla de negocio 5 del spec prohíbe explícitamente.
- Orden por defecto: mismo criterio ya usado por cada módulo (`empresa ASC, nombreResponsable ASC` en clientes, etc.) — este sprint no cambia el orden, solo agrega paginación sobre él.
- El umbral "activar cuando supere 50 registros" mencionado como pendiente en los sprints 002/003 queda resuelto activando la paginación siempre (server-side desde el primer registro) — es más simple de mantener que una condición de activación dinámica en el frontend, y no tiene costo perceptible con `LIMIT`/`OFFSET` indexado.

### `Paginador` (`packages/ui/src/paginador.tsx`)

Componente de presentación pura, sin llamadas a datos — el hook de cada módulo es dueño del estado `pagina`/`porPagina` y decide cuándo volver a pedir datos:

```typescript
interface PaginadorProps {
  pagina: number;
  porPagina: number;
  total: number;
  onCambiarPagina: (pagina: number) => void;
  onCambiarPorPagina: (porPagina: number) => void;
}
```

Estilos: mismos tokens que el resto de la tabla (`text-body-sm text-dark-4 dark:text-dark-6`, botones `variante="secundario"` del `Boton` de `packages/ui`), sin inventar un sistema nuevo.

---

## Diseño técnico — `AvisoPrivacidad`

Registro simple de trazabilidad (no un formulario de consentimiento firmado — ver spec). Un `Cliente` o `Sucursal` puede tener **más de un** aviso a lo largo del tiempo (ej. si cambia la base legal declarada) — no hay restricción de unicidad; la pantalla de detalle de cliente/sucursal muestra el más reciente y, si se requiere, el historial completo.

```
POST /clientes/:id/aviso-privacidad   { baseLegal: string }
  → registradoPorId = req.usuario.id (JWT, nunca del body)
  → entidadTipo = "CLIENTE", entidadId = :id
```

No requiere pantalla dedicada nueva más allá de un bloque simple en la pantalla de edición de cliente/sucursal ya existente ([[002-crud-clientes]] / [[003-sucursales-certificacion]]) — este sprint no rediseña esas pantallas, solo agrega el bloque "Base legal de tratamiento de datos" con el texto declarado y quién/cuándo lo registró.

---

## Diseño de UI — las 2 pantallas nuevas

### `Configuración → Auditoría` (`/configuracion/auditoria`, solo lectura)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Configuración > Auditoría                                [Breadcrumb]│
├──────────────────────────────────────────────────────────────────────┤
│ Auditoría                                                             │
│ Registro histórico de acciones críticas del sistema                  │
├──────────────────────────────────────────────────────────────────────┤
│ Usuario [▼]   Acción [▼]   Desde [____]  Hasta [____]                │
├──────────────────────────────────────────────────────────────────────┤
│ FECHA           USUARIO        ACCIÓN                ENTIDAD          │
│ 16/07/2026 10:02 Juan Pérez    LOGIN                  —               │
│ 16/07/2026 09:40 María Solís   CERTIFICACION_FIRMADA  Sucursal Norte  │
│ ...                                                                    │
├──────────────────────────────────────────────────────────────────────┤
│                              [Paginador]                              │
└──────────────────────────────────────────────────────────────────────┘
```

Sin columna de acciones — es intencional (solo lectura, regla de negocio 1). Tokens: mismo contenedor `rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card` que el resto de tablas del sistema.

### `Configuración → Política de retención` (`/configuracion/retencion`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Configuración > Retención de datos                        [Breadcrumb]│
├──────────────────────────────────────────────────────────────────────┤
│ Retención de datos                                                    │
│ Define cuánto tiempo se conservan los datos antes de purgarse         │
├──────────────────────────────────────────────────────────────────────┤
│ TIPO DE DATO                    MESES DE RETENCIÓN   ACCIÓN AL VENCER │
│ Evidencias de inspección        [ 24 ]                [Anonimizar ▼]  │
│ PDF de certificación             [ 60 ]                [Anonimizar ▼]  │
│ Datos personales de contacto     [ 36 ]                [Anonimizar ▼]  │
├──────────────────────────────────────────────────────────────────────┤
│                                          [Guardar cambios]             │
└──────────────────────────────────────────────────────────────────────┘
```

Guardado explícito (botón único, mismo criterio que la matriz de permisos de [[007-gobernanza-permisos-aprobacion]]) — no autoguardado por campo.

---

## Contrato de API (resumen)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/auditoria` | Lista paginada (`?usuarioId=&accion=&desde=&hasta=&pagina=&porPagina=`) — solo lectura |
| GET | `/retencion/politicas` | Las 3 políticas de retención de la empresa |
| PUT | `/retencion/politicas/:tipoDato` | `{ mesesRetencion, accionAlVencer }` |
| POST | `/clientes/:id/aviso-privacidad` | `{ baseLegal }` |
| GET | `/clientes/:id/aviso-privacidad` | Historial de avisos del cliente |
| POST | `/sucursales/:id/aviso-privacidad` | `{ baseLegal }` |
| GET | `/sucursales/:id/aviso-privacidad` | Historial de avisos de la sucursal |
| POST | `/usuarios/:id/cambiar-password` | `{ passwordActual, passwordNueva }` |
| GET | `/clientes` | **Modificado**: ahora acepta `?pagina=&porPagina=&activo=` y retorna `meta.total` |
| GET | `/sucursales` | **Modificado**: mismo contrato de paginación |
| GET | `/certificaciones` | **Modificado**: mismo contrato de paginación |

Todos los errores siguen el envelope: `{ error: { codigo, mensaje, detalles? } }`.

**Códigos de error nuevos de este sprint:**
```json
{ "error": { "codigo": "sesion_expirada", "mensaje": "Tu sesión expiró, inicia sesión nuevamente." } }
{ "error": { "codigo": "no_autenticado", "mensaje": "No se encontró una sesión válida." } }
{ "error": { "codigo": "password_debil", "mensaje": "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número." } }
{ "error": { "codigo": "tipo_dato_invalido", "mensaje": "El tipo de dato no existe en el catálogo de retención." } }
```

---

## Estándares técnicos obligatorios

### Arquitectura hexagonal (backend)

```
domain/          → sin imports de Express, Prisma, ni infraestructura. RegistroAuditoriaRepositoryPort
                    solo declara registrar()/listar() — el tipo mismo impide edición/borrado.
application/     → sin imports de Express ni @prisma/client; usa solo puertos del domain.
infrastructure/  → único lugar donde viven Prisma, Express y el SP (`$queryRaw`). El job de purgado
                    vive aquí porque orquesta infraestructura (cron + SP + Storage), no reglas de negocio.
```

Verificaciones que hace `agente-qa` en cada PR de este sprint:
- Ningún archivo en `domain/`/`application/` de `auditoria`, `retencion`, `privacidad` importa `express`, `@prisma/client` ni `pg`.
- `RegistroAuditoriaRepositoryPort` no declara métodos de edición/eliminación (verificación de tipo, no solo de convención).
- El SP se invoca únicamente desde `infrastructure/` (`job-purgar-retencion.job.ts`), nunca desde `application/`.

### Clean Code

- Nombres en español: `registrarEventoAuditoria`, `validarPoliticaPassword`, `purgarDatosVencidos`.
- El job de purgado no decide reglas de negocio en TypeScript — delega la decisión de qué/cuándo purgar al SP y a `politica_retencion`; el job solo orquesta y audita.
- `pnpm lint` debe pasar en verde en `apps/api` y `apps/web`.

### Documentación ISO — JSDoc

Obligatorio en: `domain/registro-auditoria.entity.ts`, `domain/politica-retencion.entity.ts`, `domain/politica-password.entity.ts`, y en el helper `registrarEventoAuditoria()` (por ser un punto de integración transversal que otros módulos van a copiar/reutilizar).

```
/**
 * Valida que una contraseña cumpla la política mínima de seguridad.
 *
 * @param password - Contraseña en texto plano a validar (nunca se persiste en este formato).
 * @returns null si cumple la política; el primer mensaje de error encontrado si no.
 * @example
 *   validarPoliticaPassword("Abcd1234") // → null
 *   validarPoliticaPassword("abcd")     // → "La contraseña debe tener al menos 8 caracteres."
 */
export function validarPoliticaPassword(password: string): string | null
```

---

## Notas importantes

- Este sprint **no** crea los módulos `clientes`, `sucursales` ni `certificacion` desde cero — se asumen implementados por sprints 002/003/005. Las tareas de este sprint que los tocan (T-433, T-441) son modificaciones puntuales (agregar paginación), no reescrituras.
- La política de backup (T-443/T-444) es un documento operativo de `agente-produccion`, no código de aplicación — vive en `packages/db/produccion/politica-backup.md`, junto al resto del historial de despliegues de BD (ver `CLAUDE.md` → "Carpeta de producción").
- El proveedor de hosting de `apps/api` sigue pendiente (ver `CLAUDE.md` → Despliegue); el job de purgado (T-432) y el documento de backup (T-443) deben quedar redactados de forma que no asuman un proveedor específico todavía — se ajustan cuando esa decisión se tome.
- `empresaId` en todos los endpoints y en el SP viene siempre del JWT/parámetro explícito, nunca del body — mismo principio de defensa en profundidad de `CLAUDE.md` → "Aislamiento multiempresa".
- Decisiones de diseño propias tomadas por ambigüedad del spec (documentar en `memoria/decisiones.md` al implementar, no asumidas como definitivas aquí): mecanismo de purgado vía SP + job cron (spec solo pedía "el proceso de purgado" sin especificar mecanismo); una evidencia binaria vencida siempre se `ELIMINA` aunque la política diga `ANONIMIZAR` (una foto no tiene un estado "anonimizado" intermedio con sentido); `DATO_PERSONAL_CONTACTO` con `accionAlVencer = ELIMINAR` se trata como `ANONIMIZAR` mientras existan sucursales/certificaciones asociadas, para no violar integridad referencial.
